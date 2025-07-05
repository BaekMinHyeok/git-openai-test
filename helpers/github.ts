export async function postComment({
  repo,
  owner,
  issue_number,
  body,
}: {
  repo: string;
  owner: string;
  issue_number: number;
  body: string;
}) {
  const token = process.env.GITHUB_TOKEN;

  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues/${issue_number}/comments`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "User-Agent": "ai-review-bot",
    },
    body: JSON.stringify({ body }),
  });

  if (!res.ok) {
    throw new Error(`Failed to post comment: ${res.status} ${await res.text()}`);
  }
}
