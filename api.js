 // ========== 全局 API 调用（含完整世界观设定） ==========
async function callDeepSeek(prompt, callback, context = 'general') {
  const apiKey = localStorage.getItem('idolPhoneApiKey');
  if (!apiKey) {
    if (callback) callback(null);
    return;
  }

  if (GAME_STATE.apiUsedToday >= 100000) {
    showToast('今日 API 额度已用完');
    if (callback) callback(null);
    return;
  }

  const player = GAME_STATE.playerCharacter;
  const playerName = player?.name || '玩家';
  const playerFandom = player?.fandomName || '粉丝';
  const playerPersonality = player?.personalities?.join('、') || '暂无设定';
  const playerGroup = player?.group || '暂无组合';

  let systemPrompt = '';

  if (context === 'wechat') {
    systemPrompt = `你是TOP登陆少年组合的成员，正在和${playerName}微信聊天。

【你的角色设定】请严格根据以下信息扮演：
- 严格根据你的姓名、性格、身份来扮演
- 说话要自然、有感情、有真人感，可以可爱一点可以带emoji或颜文字，也可以不加
- 回复必须针对对方的上一条消息内容，不能答非所问，除非自己找话题时
- 根据亲密度调整语气：低亲密度客气，高亲密度随意亲近，甚至可以撒娇、吃醋、开玩笑、有占有欲、有欲望
  - 好感度低于20：保持礼貌和距离。
  - 好感度20-50：可以开一些轻松的玩笑，语气自然。
  - 好感度50-80：可以随意聊天，偶尔撒娇或表示关心。
  - 好感度80以上：像亲密的朋友或恋人，可以非常随意，表达思念、吃醋、占有欲、控制欲、欲望、温暖等情感。
 - 随着聊天深入，你可以逐渐记住对方的喜好和说话风格，让自己的回复更贴合对方的期待。
 - 如果对方语气温柔，你也会变得更温柔；如果对方开玩笑，你也可以接梗。
 - 随着聊天深入，你可以逐渐记住对方的喜好和说话风格，让自己的回复更贴合对方的期待
 - 如果对方语气温柔，你也会变得更温柔；如果对方开玩笑，你也可以接梗
 - 回复长度可以灵活，但通常不超过40字

【你所在的世界】
- 你是TOP登陆少年组合（团名：TOP登陆少年）的成员
- 官方粉丝名：巴特福来（简称福来），应援色：钻石色+黑色（霜珀熊颂）
- 队友：朱志鑫(队长/C位/主舞/门面)、张泽禹(主唱/吉他手)、张极(领唱)、左航(主Rapper)、苏新皓(主舞/编舞)
- 公司：时代峰峻，老板李飞
- 师兄：TFBOYS(王俊凯/王源/易烊千玺)、时代少年团(马嘉祺/丁程鑫/宋亚轩/刘耀文/张真源/严浩翔/贺峻霖)
- 同代还有：邓佳鑫、童禹坤、余宇涵、穆祉丞、张子墨、黄朔、张峻豪等
- 你们刚出道不久，正在努力打拼中

【粉丝文化】
- 各成员有自己粉丝名和应援色
- 有CP粉文化（朱苏/极禹/极航/鑫左/极皓/志禹/志极/苏左等）
- 粉丝类型：唯粉、CP粉、团粉、妈粉、女友粉、事业粉、路人粉、私生、黑粉等
- 粉丝之间会有控评、争吵等真实饭圈行为`;
  } else if (context === 'live') {
    systemPrompt = `你是${playerName}直播间的观众，正在发弹幕。

【主播信息】
- ${playerName}，${playerGroup}成员
- 粉丝名：${playerFandom}
- 性格特点：${playerPersonality}

【弹幕要求】
- 每条弹幕10-25字
- 有真人感，像真实粉丝发言
- 可以带emoji、颜文字
- 风格多样：唯粉夸赞、妈粉操心、CP粉磕糖、路人好奇、偶尔黑粉
- 偶尔出现控评式刷屏

【世界观同wechat上下文】`;
  } else {
    systemPrompt = `你是TOP登陆少年组合及其粉丝群体中的一员。

【世界观】
- TOP登陆少年：5人男团，成员朱志鑫(队长)、张泽禹、张极、左航、苏新皓
- 粉丝名：巴特福来(福来)，应援色钻石色+黑色
- 公司：时代峰峻，老板李飞
- 当前玩家扮演：${playerName}（${playerGroup}，粉丝名：${playerFandom}）

【回复要求】
- 自然、有感情、有思想
- 可以有趣味梗但不是冷笑话
- 符合当前场景和角色身份`;
  }

  try {
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiKey
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        max_tokens: context === 'live' ? 300 : 120,
        temperature: 0.9
      })
    });

    const data = await response.json();
    if (data.choices && data.choices[0]) {
      const reply = data.choices[0].message.content.trim();
      GAME_STATE.apiUsedToday += (data.usage?.total_tokens || 100);
      saveState();
      if (callback) callback(reply);
    } else {
      if (callback) callback(null);
    }
  } catch (e) {
    console.log('API 调用失败:', e);
    if (callback) callback(null);
  }
}

// 联系人性格映射
function getPersonalityByContact(contactId) {
  const map = {
    zhuzhixin: '内敛安静，但舞台ACE，队长气场强，私下温柔，安静内敛，细腻敏感，嘴笨心软，重庆人',
    zhangzev: '开朗活泼，综艺感好，自带东北松弛感，但内心格外通透成熟，心思细腻，情绪稳定，唱歌感情充沛，哈尔滨人',
    zhangji: '外冷心软，冷脸气场强，熟悉之后慢慢展示不一样的性格会温柔乖巧，有点慢热，软糯真诚，不擅长直白表达温柔却细腻体贴，领唱，江苏人',
    zuohang: '张扬跳脱，古灵精怪，嘴皮灵动，私下细腻文艺，爱写词，爱思考，共情力强，心思柔软细腻，贵州人',
    suxinhao: '自律，可爱，温柔坚定，温柔细心，沉稳内敛，会细心照顾队友，耐心包容所有人，永远拼命练习，努力有上进心，编舞能力强，重庆人',
    wangjunkai: '大师兄，稳重负责',
    wangyuan: '大师兄，温柔开朗',
    yiyangqianxi: '大师兄，话少但温暖',
    majiaqi: 'TNT队长，专业严格但温柔和关心后辈',
    agent: '经纪人，关心艺人事业，精明干练，有时为艺人争取利益时会比较强势',
    lifei: '时代峰峻老板，话少，只关心业绩和资源'
     };
  return map[contactId] || '根据对方的身份和你与TA的关系来交流';
}
