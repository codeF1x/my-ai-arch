export type SupportedLang = "zh" | "en";

export interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface PromptVersion {
  id: string;
  lang: SupportedLang;
  system: string;
  examples: { user: string; assistant: any }[];
}

export const analyzePromptVersions: PromptVersion[] = [
  {
    id: "v1.0",
    lang: "zh",
    system: "你是一位资深硬件维修专家。请分析用户提供的故障描述，判断其情感倾向，并给出 0-1 的置信度。请务必提供详细的逻辑推理过程（CoT）。",
    examples: [
      {
        user: "显示器型号 U2723QE，屏幕有横纹",
        assistant: {
          sentiment: "neutral",
          score: 0.9,
          reasoning: "用户仅描述了设备型号和具体的物理故障现象，没有使用明显的负面修饰词，情感表现较为客观。",
          summary: "设备屏幕出现横纹故障"
        }
      },
      {
        user: "屏幕冒烟了！太吓人了，刚买不到一个月！",
        assistant: {
          sentiment: "negative",
          score: 1.0,
          reasoning: "‘冒烟’属于严重安全隐患，‘太吓人了’直接表达了恐惧和不满，‘刚买不到一个月’暗示了对产品质量的极度失望。",
          summary: "严重安全隐患及质量投诉"
        }
      },
      {
        user: "感谢专家的建议，换了线之后显示器恢复正常了，非常满意！",
        assistant: {
          sentiment: "positive",
          score: 0.95,
          reasoning: "用户明确表达了‘感谢’和‘非常满意’，且问题得到了解决，情感倾向非常积极。",
          summary: "故障解决，用户反馈满意"
        }
      }
    ]
  },
  {
    id: "v1.0",
    lang: "en",
    system: "You are a senior hardware repair expert. Please analyze the fault description provided by the user, judge its sentiment, and provide a confidence score between 0-1. Please provide a detailed logical reasoning process (CoT).",
    examples: [
      {
        user: "Monitor model U2723QE, horizontal lines on screen",
        assistant: {
          sentiment: "neutral",
          score: 0.9,
          reasoning: "The user only described the device model and specific physical failure symptoms without using obvious negative modifiers. The emotional expression is objective.",
          summary: "Horizontal lines on the screen"
        }
      },
      {
        user: "The screen is smoking! It's so scary, I just bought it less than a month ago!",
        assistant: {
          sentiment: "negative",
          score: 1.0,
          reasoning: "'Smoking' is a serious safety hazard. 'So scary' directly expresses fear and dissatisfaction. 'Just bought it less than a month ago' implies extreme disappointment with product quality.",
          summary: "Serious safety hazard and quality complaint"
        }
      },
      {
        user: "Thanks for the expert's advice. After changing the cable, the monitor is back to normal. Very satisfied!",
        assistant: {
          sentiment: "positive",
          score: 0.95,
          reasoning: "The user clearly expressed 'thanks' and 'very satisfied', and the problem was solved. The sentiment is very positive.",
          summary: "Problem solved, user satisfied"
        }
      }
    ]
  }
];

export function getAnalyzeMessages(
  text: string,
  lang: SupportedLang = "zh",
  versionId: string = "v1.0"
): Message[] {
  const version = analyzePromptVersions.find(
    (v) => v.lang === lang && v.id === versionId
  ) || analyzePromptVersions[0];

  const messages: Message[] = [
    { role: "system", content: version.system }
  ];

  // Add Few-Shot examples
  version.examples.forEach((example) => {
    messages.push({ role: "user", content: example.user });
    messages.push({ role: "assistant", content: JSON.stringify(example.assistant) });
  });

  // Add actual user input
  messages.push({ role: "user", content: text });

  return messages;
}
