/**
 * A mock AI service that returns a "summary" for an email chain.
 * Replace this with a real request to an LLM or other text analysis API.
 */
export async function generateSummary(emailThread: string): Promise<string> {
    // Some silly summarizing logic for demonstration
    const summary = `
      This is a mock summary of your email thread:
      "${emailThread.substring(0, 50)}..."
      Thank you!
    `
    return new Promise((resolve) => {
      setTimeout(() => resolve(summary.trim()), 1200)
    })
  }
  