import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

// Lightweight i18n: English strings are the keys; the zh table maps them to
// Simplified Chinese. t() falls back to the key itself, so untranslated or
// dynamic strings render unchanged. {x}-style params are interpolated.
export type Lang = 'en' | 'zh';

const STORAGE_KEY = 'app_lang';

const zh: Record<string, string> = {
  // Tabs
  'Dashboard': '仪表盘',
  'Food': '饮食',
  'Trends': '趋势',
  'Health': '健康',
  'Settings': '设置',

  // Dashboard
  'Good morning!': '早上好!',
  'Editing a past day': '正在编辑过去的日期',
  'Edit Today': '编辑今天',
  'Edit This Day': '编辑这一天',
  'Daily Score': '今日得分',
  'habits complete': '项习惯完成',
  'complete': '完成',
  'Streak': '连续打卡',
  'This Week': '本周',
  'Weight': '体重',
  'Waist': '腰围',
  'Habits': '习惯',
  'days logged': '天已记录',
  'Quick Log': '快速记录',
  'Tap to log today — saves instantly': '点按记录今天 — 自动保存',
  'Editing {x} — saves to that day': '正在编辑 {x} — 保存到那一天',
  'Saved': '已保存',
  'Daily Coaching': '每日教练',
  'Reading your week…': '正在分析你的一周…',
  'AI coaching turns on once the AI key is configured.': '配置好 AI 密钥后即可开启教练功能。',
  'Coach me': '给我建议',
  'Try again': '重试',
  "Get a quick, personal read on your week based on what you've logged.": '根据你的记录,快速获得属于你的本周解读。',
  'Could not reach your coach. Please try again.': '无法连接教练,请重试。',
  "Today's Metrics": '今日指标',
  'Body Fat': '体脂',
  'Lean Mass': '瘦体重',
  'Resting HR': '静息心率',
  'HRV': '心率变异性',
  'Active Cal': '运动消耗',
  'Protein': '蛋白质',
  'Steps': '步数',
  'Water': '饮水',
  'Cycle Day': '周期天数',
  'Score': '得分',
  'Daily Habits': '每日习惯',
  'Protein >= 90g': '蛋白质 ≥ 90g',
  'Vegetables >= 2 servings': '蔬菜 ≥ 2 份',
  'Steps >= 8,000': '步数 ≥ 8000',
  'Strength Training': '力量训练',
  'Sleep >= 7 hours': '睡眠 ≥ 7 小时',
  'Water >= 1.8L': '饮水 ≥ 1.8L',
  'Low Carb Dinner': '低碳水晚餐',
  'No Sugary Drinks': '不喝含糖饮料',
  "Log Today's Metrics": '记录今日指标',
  'Edit {x}': '编辑 {x}',
  'Waist Circumference': '腰围',
  'Save Metrics': '保存指标',

  // Food
  'Nutrition': '营养',
  'Today': '今天',
  'Calories': '卡路里',
  'Carbs': '碳水',
  'Fat': '脂肪',
  'AI Meal Analysis': 'AI 饮食分析',
  'Nutrition Coach': '饮食教练',
  'Get advice on what to eat next to hit your targets today.': '获取建议:接下来吃什么才能达成今天的目标。',
  'Reading your day…': '正在分析你今天的饮食…',
  'Coach my eating': '给我饮食建议',
  "Don't know the calories? Snap a photo or describe a meal and AI estimates it.": '不知道卡路里?拍张照片或描述一下,AI 帮你估算。',
  'Breakfast': '早餐',
  'Lunch': '午餐',
  'Dinner': '晚餐',
  'Snack': '加餐',
  'Add {x}': '添加{x}',
  'Tap + to add {x}': '点 + 添加{x}',
  'Quick add from your plan': '从你的食谱快速添加',
  'tap to log': '点一下直接添加',
  'Added': '已添加',
  'Estimate with AI': '用 AI 估算',
  'Describe the food (optional)': '描述食物(可选)',
  'Approx. amount (optional)': '大概份量(可选)',
  'Estimate': '估算',
  'Photo': '照片',
  'Could not analyze the meal. Please try again.': '无法分析这餐,请重试。',
  'AI analysis is not set up yet.': 'AI 分析还未配置。',
  'adjust the numbers below if needed.': '如有需要可在下方调整数字。',
  'Food Name': '食物名称',
  'Carbohydrates': '碳水化合物',
  'Add Food': '添加食物',
  'Edit Food': '编辑食物',
  'GF': '好油',
  'Amount': '份量',
  'Use raw weight (before cooking).': '按生重填(下锅前的重量)。',
  'Calories & macros scale exactly with the grams above.': '卡路里和营养会随上面的克数精确换算。',
  'Good Fat': '好油脂',
  'Vegetables': '蔬菜',
  'servings': '份',
  "Today's Target": '今日目标',
  '{x} left': '还剩 {x}',
  'over {x}': '超 {x}',
  'Set daily targets in Settings → Nutrition Targets to track progress here.': '在 设置 → 营养目标 里设定每日目标,这里就能看进度。',
  'e.g. bowl of oatmeal with a banana': '例如:一碗燕麦加香蕉',
  'e.g. Greek Yogurt': '例如:希腊酸奶',

  // Health
  'Sleep': '睡眠',
  'Last Night': '昨晚',
  'No sleep data logged': '暂无睡眠记录',
  'Bedtime': '就寝时间',
  'Deep Sleep': '深睡',
  'REM Sleep': 'REM 睡眠',
  'Deep {x}h': '深睡 {x}h',
  'Menstrual Cycle': '月经周期',
  'Cycle Day {x}': '周期第 {x} 天',
  'Started {x}': '始于 {x}',
  '{x}d cycle': '{x} 天周期',
  'No cycle data logged': '暂无周期记录',
  'Lab Results': '化验结果',
  'No lab results logged': '暂无化验记录',
  'Scan Lab Report': '拍照识别化验单',
  'Snap a photo of your report and AI fills in the numbers.': '拍一张化验单照片,AI 自动帮你填好数值。',
  'Scan Report': '拍照识别',
  'Reading your report…': '正在识别报告…',
  'Could not read the lab report. Please try again.': '无法识别化验单,请重试。',
  'Cortisol': '皮质醇',
  'Vit D': '维生素D',
  'Vitamin D': '维生素D',
  'Progesterone': '孕酮',
  'Glucose': '血糖',
  'Cholesterol': '胆固醇',
  'CGM Glucose': '动态血糖',
  'No CGM data today': '今天暂无血糖数据',
  'Log Sleep': '记录睡眠',
  'Hours Slept': '睡眠时长',
  'Sleep Score': '睡眠评分',
  'Notes': '备注',
  'How did you feel?': '感觉如何?',
  'Save Sleep': '保存睡眠',
  'Log Period': '记录经期',
  'Period Start Date (YYYY-MM-DD)': '经期开始日期 (YYYY-MM-DD)',
  'Cycle Length': '周期长度',
  'days': '天',
  'Symptoms, mood...': '症状、心情…',
  'Save Cycle': '保存周期',
  'Add Lab Results': '添加化验结果',
  'Test Date (YYYY-MM-DD)': '检测日期 (YYYY-MM-DD)',
  'Additional notes...': '其他备注…',
  'Save Results': '保存结果',
  'Log CGM Data': '记录血糖数据',
  'Daily Average Glucose': '日均血糖',
  'Time In Range': '达标时间占比',
  'Any notable glucose spikes?': '有明显的血糖波动吗?',
  'Save CGM Data': '保存血糖数据',
  'Avg {x}': '平均 {x}',
  'Score {x}': '评分 {x}',

  // Trends
  'Body Fat %': '体脂率',
  'Protein Intake': '蛋白质摄入',
  'Sleep Duration': '睡眠时长',
  'Habit Completion': '习惯完成率',
  'No data yet': '暂无数据',

  // Settings
  'Edit': '编辑',
  'Goals': '目标',
  'My Goals': '我的目标',
  'Tell your AI coach what you are aiming for': '告诉 AI 教练你的目标',
  'Target Weight': '目标体重',
  'Target Waist': '目标腰围',
  'Focus (what matters to you)': '关注点(对你最重要的)',
  'e.g. fat loss, better sleep, keep muscle': '例如:减脂、改善睡眠、保持肌肉',
  'e.g. fat loss, better sleep, more focus': '例如:减脂、改善睡眠、提升专注力',
  'Medications / health notes (optional)': '用药 / 健康备注(可选)',
  'e.g. taking medication X, sensitive to caffeine': '例如:长期服用某药、对咖啡因敏感',
  'Save Goals': '保存目标',
  'Could not save goals': '无法保存目标',
  'Nutrition Targets': '营养目标',
  '16:8 Fasting': '16:8 断食',
  'Off': '关闭',
  'Set your daily eating window — the app shows live eating/fasting status & countdown.': '设置每天的进食窗口,App 会实时显示进食中/断食中和倒计时。',
  'Show fasting window': '显示断食窗口',
  'Eating window start': '进食开始',
  'Eating window end': '进食结束',
  'Eating window open': '进食窗口',
  'closes in {x}': '{x} 后关闭',
  'Fasting': '断食中',
  'eat in {x}': '{x} 后开吃',
  '{x} kcal/day target': '每日目标 {x} 卡',
  'Set calories, protein, carbs & good fat': '设定卡路里、蛋白质、碳水和好油脂',
  'Your daily plan to lose fat. Tap “Suggest from my weight”, then adjust.': '你的减脂每日计划。点「按体重建议」再微调。',
  'Suggest from my weight': '按体重建议',
  'Save Targets': '保存目标',
  'No weight yet': '还没有体重',
  'Log your weight first so targets can be based on it.': '先记录体重,才能按它来算目标。',
  'Reminders': '提醒',
  'Morning Check-in': '早晨打卡',
  'Start your day right': '开启美好一天',
  'Lunch Reminder': '午餐提醒',
  'Track your midday meal': '记录你的午餐',
  'Evening Check-in': '晚间打卡',
  'Review your day': '回顾今天',
  'Notifications': '通知',
  'Push Notifications': '推送通知',
  'Get reminders on this device': '在此设备接收提醒',
  'Add to Home Screen to enable': '添加到主屏幕后可开启',
  'Email Reminders': '邮件提醒',
  'Sent to {x}': '发送至 {x}',
  'Add an email to your profile first': '请先在个人资料中添加邮箱',
  'Notifications blocked': '通知被阻止',
  'Enable notifications for this site in your browser settings, then try again.': '请在浏览器设置中允许此网站的通知,然后重试。',
  'Not supported here': '此环境不支持',
  'Open the app in a browser (and add it to your Home Screen on iOS) to enable push notifications.': '请在浏览器中打开本应用(iOS 需先添加到主屏幕)再开启推送通知。',
  'Almost there': '就差一步',
  'Push is not configured yet (missing VAPID key). Email reminders still work.': '推送还未配置(缺少密钥),邮件提醒仍可使用。',
  'Something went wrong': '出错了',
  'Could not enable push notifications. Please try again.': '无法开启推送通知,请重试。',
  'Language': '语言',
  'Dashboard Cards': '仪表盘卡片',
  'Choose what shows on your dashboard': '选择仪表盘显示的内容',
  'Cycle tracking': '经期相关内容',
  'Shows the cycle card and Health section': '控制周期卡片和健康页的经期板块',
  'Data': '数据',
  'Connect Withings scale': '连接 Withings 体脂秤',
  'Auto-import weight, body fat, lean mass': '自动导入体重、体脂、瘦体重',
  'Connected — weight & body fat sync automatically': '已连接 — 体重、体脂自动同步',
  'Could not start Withings connection. Please try again.': '无法开始 Withings 连接,请重试。',
  'Withings is not set up yet on the server.': '服务器还没配置好 Withings。',
  'Export Data': '导出数据',
  'Download your health data': '下载你的健康数据',
  'Import Data': '导入数据',
  'Upload from another device': '从其他设备上传',
  'Backup Data': '备份数据',
  'Auto-synced to Supabase': '自动同步至云端',
  'Account': '账户',
  'Sign Out': '退出登录',
  'Are you sure you want to sign out?': '确定要退出登录吗?',
  'Cancel': '取消',
  'Edit Profile': '编辑个人资料',
  'Full Name': '姓名',
  'Your name': '你的名字',
  'Height': '身高',
  'Save Profile': '保存个人资料',
  'Could not save profile': '无法保存个人资料',
  'Not signed in': '未登录',
  'Please sign in again and retry.': '请重新登录后再试。',

  // Sleep sync
  'Sleep Sync': '睡眠同步',
  'Auto-import sleep from Garmin / Apple Health': '自动导入 Garmin / 苹果健康的睡眠',
  'Your personal sync link (keep it private):': '你的专属同步链接(请勿外传):',
  'Use it in an iPhone Shortcut to send last night\u2019s sleep automatically — setup steps are in the chat guide.':
    '在 iPhone「快捷指令」里使用它,每天自动发送昨晚睡眠 — 配置步骤见聊天指南。',

  // Shared components
  'Done': '完成',
  'Save': '保存',
  'Saving...': '保存中…',
};

interface I18nValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

function interpolate(s: string, params?: Record<string, string | number>): string {
  if (!params) return s;
  return s.replace(/\{(\w+)\}/g, (_, k) => (params[k] != null ? String(params[k]) : `{${k}}`));
}

function translate(lang: Lang, key: string, params?: Record<string, string | number>): string {
  const raw = lang === 'zh' ? (zh[key] ?? key) : key;
  return interpolate(raw, params);
}

function loadLang(): Lang {
  try {
    if (typeof localStorage !== 'undefined') {
      const v = localStorage.getItem(STORAGE_KEY);
      if (v === 'zh' || v === 'en') return v;
    }
  } catch {
    // ignore
  }
  return 'en';
}

const I18nContext = createContext<I18nValue>({
  lang: 'en',
  setLang: () => {},
  t: (key, params) => translate('en', key, params),
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(loadLang);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, l);
    } catch {
      // ignore
    }
  }, []);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) => translate(lang, key, params),
    [lang]
  );

  return <I18nContext.Provider value={{ lang, setLang, t }}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  return useContext(I18nContext);
}
