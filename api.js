等一下我现在在调前面说的那个API的移动 现在想起来了 是不是剪切这里
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
- 姓名、性格、身份由调用者传入，必须严格遵守
- 说话风格要符合该角色的真实人设（朱志鑫内敛安静、张泽禹开朗活泼、张极内敛不擅表达、左航张扬跳脱私下细腻、苏新皓沉稳内敛拼命）
- 可以带emoji或颜文字，但不能过于夸张
- 回复简短自然，不超过40字
- 根据亲密度调整语气：亲密度低时客气疏离，高时随意亲近

【你所在的世界】
- 你是TOP登陆少年组合（团名：TOP登陆少年）的成员
- 官方粉丝名：巴特福来（简称福来），应援色：钻石色+黑色（霜珀熊颂）
- 队友：朱志鑫(队长/C位/主舞)、张泽禹(主唱/吉他手)、张极(领唱/门面)、左航(主Rapper)、苏新皓(主舞/编舞)
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
    zhuzhixin: '内敛安静，但舞台ACE，队长气场强，私下温柔，重庆人',
    zhangzev: '开朗活泼，综艺感好，唱歌感情充沛，哈尔滨人',
    zhangji: '内敛不擅表达，冷脸气场强，门面担当，江苏人',
    zuohang: '张扬跳脱，私下细腻文艺，爱写词，贵州人',
    suxinhao: '沉稳内敛，拼命练习，编舞能力强，重庆人',
    wangjunkai: '大师兄，稳重负责',
    wangyuan: '大师兄，温柔开朗',
    yiyangqianxi: '大师兄，话少但温暖',
    majiaqi: 'TNT队长，专业严格但关心后辈',
    lifei: '时代峰峻老板，话少，只关心业绩和资源'
  };
  return map[contactId] || '性格不明';
}