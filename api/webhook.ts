import fetch from "node-fetch";

export const config = {
  api: {
    bodyParser: true, // JSON 파싱 허용
  },
};

type OpenAIChatResponse = {
  choices: {
    message: {
      content: string;
    };
  }[];
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  // 예외 처리: body가 없거나 구조가 이상할 경우
  if (!req.body || !req.body.action || !req.body.pull_request) {
    return res.status(400).send("Invalid GitHub webhook payload");
  }

  const { action, pull_request } = req.body;

  if (action !== "opened") {
    return res.status(200).send("Not a new PR");
  }

  try {
    const diff = await fetch(pull_request.diff_url).then((res) => res.text());

    const prompt = `
You are an expert code reviewer. Review the following GitHub Pull Request diff and provide suggestions, improvements, or potential issues.

Git Diff:
${diff}
    `;

    const gptResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const gptData = (await gptResponse.json()) as OpenAIChatResponse;
    const comment = gptData.choices?.[0]?.message?.content || "No review generated.";

    await fetch(pull_request.comments_url, {
      method: "POST",
      headers: {
        Authorization: `token ${process.env.GITHUB_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ body: comment }),
    });

    return res.status(200).json({ status: "Review posted successfully" });
  } catch (error) {
    console.error("Webhook Error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
