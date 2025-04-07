// ==UserScript==
// @name         Group Message Alert
// @author       冰羽
// @version      1.0.1
// @description  让你的骰子监听特定群聊，发现符合要求的消息即私聊汇报给所有注册本服务的用户
// @timestamp    1742376577
// @license      MIT
// @sealVersion  1.5.0-dev
// ==/UserScript==

function put_in(ext,key,ori_value){
    let data = JSON.stringify(ori_value);
    ext.storageSet(key,data);
}
function put_out(ext,key){
    let data = JSON.parse(ext.storageGet(key) || '{"memberList":[]}');
    return data;
}
function rebuildMsg(ori_msg){
    let msg = seal.newMessage();
    msg.groupId=ori_msg.groupId;msg.guildId=ori_msg.guildId;msg.message=ori_msg.message;msg.messageType=ori_msg.messageType;msg.platform=ori_msg.platform;msg.time=ori_msg.time;msg.rawId=ori_msg.rawId;
    msg.sender.nickname=ori_msg.sender.nickname;msg.sender.userId=ori_msg.sender.userId;
    return msg;
}
function rebuildCtx(endPoint,ori_msg){
    let msg = rebuildMsg(ori_msg);
    let ctx = seal.createTempCtx(endPoint,msg);
    return ctx;
}

const storageKey = "groupMessageAlert";

if (!seal.ext.find('GroupMessageAlert')) {
    const ext = seal.ext.new('GroupMessageAlert', 'BingYu2016', '1.0.1');
    seal.ext.register(ext);

    seal.ext.registerTemplateConfig(ext, "匹配内容", ["/(.*)?骰子灌铅(.*)?/"], "使用正则表达式格式");
    seal.ext.registerTemplateConfig(ext, "监听群聊", ["QQ-Group:114514","QQ-Group:1919810"], "监听对应群聊的消息");
    seal.ext.registerStringConfig(ext, "加入通知", "灌铅警报ON", "对骰子输入这个指令以将自己加入通知名单");
    seal.ext.registerStringConfig(ext, "退出通知", "灌铅警报OFF", "对骰子输入这个指令以将自己移出通知名单"); 

    ext.onNotCommandReceived = (ctx, msg) => {
        const allowedGroups = seal.ext.getTemplateConfig(ext, "监听群聊");
        const regex = seal.ext.getTemplateConfig(ext,"匹配内容");
        const subscribeKey=seal.ext.getStringConfig(ext,"加入通知"),unsubscribeKey=seal.ext.getStringConfig(ext,"退出通知");

        
        if(msg.message.includes(subscribeKey)){//处理订阅与退订
            let data = put_out(ext,storageKey);
            if(data.memberList.some(user => user.sender.userId === msg.sender.userId)){
                seal.replyToSender(ctx, msg,"你已经在名单里啦!");
            }
            else{
                data.memberList.push(msg);
                put_in(ext,storageKey,data);
                seal.replyToSender(ctx, msg,"已添加至通知名单~");
            }
        }else if(msg.message.includes(unsubscribeKey)){
            let data = put_out(ext,storageKey);
            if(data.memberList.some(user => user.sender.userId === msg.sender.userId)){
                let pos = data.memberList.findIndex(user => user.sender.userId === msg.sender.userId);
                data.memberList.splice(pos,1);
                seal.replyToSender(ctx, msg,"已从通知名单移除~");
                put_in(ext,storageKey,data);
            }
            else{
                seal.replyToSender(ctx, msg,"你好像不在通知名单里哦?");
            }
        }
        else if (!ctx.isPrivate) {// 判断是否为群聊并检查是否在允许的群号列表中
            const allGroupsAllowed = !allowedGroups || allowedGroups.length === 0 || (allowedGroups.length === 1 && allowedGroups[0] === "");
            if (allGroupsAllowed || allowedGroups.includes(ctx.group.groupId.toString())) {
                processMessage(ctx, msg);
            }
        }      
    
    // 封装的消息处理函数
    function processMessage(ctx, msg) {
        if (isAnyMatch(regex,msg.message) && !/\[CQ:.*?\]/.test(msg.message)) {
            let data = put_out(ext,storageKey);
            data.memberList.forEach(user => {
                if(user.sender.userId != msg.sender.userId){
                let EDP = seal.getEndPoints();
                EDP.forEach(dice => {
                    if(dice.state===1 && dice.platform === "QQ"){
                        seal.replyPerson(rebuildCtx(dice,user), rebuildMsg(user), "Warning:\n"+msg.message+"\nFrom:"+msg.sender.nickname);
                    }
                });
            }
            });
        }
    }
    function isAnyMatch(regexStrings, testString) {
        for (const regexStr of regexStrings) {
            try {
                // 解析正则表达式字符串
                const parts = regexStr.match(/^\/(.*)\/([gimuy]*)$/);
                if (!parts) continue;
                const pattern = parts[1];
                const flags = parts[2];
                const regex = new RegExp(pattern, flags);
                if (regex.test(testString)) {
                    return true;
                }
            } catch (e) {
                console.warn(`无效的正则表达式：${regexStr}`, e.message);
            }
        }
        return false; 
    }
    }
}