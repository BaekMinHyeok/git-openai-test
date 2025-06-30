// Vercel API 라우트에서 POST 요청으로 GitHub webhook 받기
export const config = { api: { bodyParser: true } };

export default async function handler(req, res) {
  // GitHub에서 보내는 이벤트 정보
  const { action, pull_request } = req.body;

  // PR이 새로 열릴 때만 처리 (opened 이벤트)
  if (action !== "opened") {
    return res.status(200).send("Event is not a new PR, ignored.");
  }

  try {
    // PR의 diff 정보 가져오기 (텍스트)
    const diffResponse = await fetch(pull_request.diff_url);
    const diff = await diffResponse.text();

    // GPT에 보낼 프롬프트 작성
    const prompt = `
You are an expert code reviewer.
Review this GitHub Pull Request diff and point out bugs, improvements, and best practices.

Git Diff:
${diff}
`;

    // OpenAI GPT API 호출
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

    const gptData = await gptResponse.json();
    const reviewComment = gptData.choices?.[0]?.message?.content || "No review generated.";

    // GitHub PR에 댓글 작성
    await fetch(pull_request.comments_url, {
      method: "POST",
      headers: {
        Authorization: `token ${process.env.GITHUB_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ body: reviewComment }),
    });

    return res.status(200).json({ status: "Review posted successfully" });
  } catch (error) {
    console.error("Error handling webhook:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
