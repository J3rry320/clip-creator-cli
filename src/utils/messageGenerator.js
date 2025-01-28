function getCategoryDescription(category) {
  const descriptions = {
    "Science & Technology":
      "Cutting-edge innovations, scientific discoveries, and technological advancements",
    "Sports & Fitness":
      "Athletic achievements, sports news, workout routines, and fitness tips",
    "Government & Politics":
      "Political developments, policy analysis, and governmental affairs",
    "Entertainment & Celebrities":
      "Movie releases, music updates, celebrity news, and pop culture trends",
    "Education & Learning":
      "Academic insights, learning resources, and educational methodologies",
    "Video Games & Esports":
      "Gaming industry news, esports tournaments, and gaming culture",
    "Travel & Tourism":
      "Destination guides, travel tips, cultural experiences, and adventure stories",
    "Health & Wellness":
      "Medical research, mental health, nutrition, and wellness practices",
    "World News":
      "Global current events, international relations, and worldwide developments",
    "Business & Finance":
      "Market analysis, entrepreneurship, financial advice, and industry trends",
    "Lifestyle & Culture":
      "Fashion, relationships, cultural phenomena, and modern living",
    "Art & Design":
      "Creative works, design trends, artistic movements, and visual culture",
    "Environment & Sustainability":
      "Climate change, conservation efforts, and sustainable practices",
    "Food & Cooking":
      "Recipes, culinary techniques, food culture, and cooking tips",
  };
  return descriptions[category] || category;
}

function getToneDescription(tone) {
  const descriptions = {
    "Professional/Formal":
      "Polished, business-appropriate language with emphasis on clarity and expertise",
    "Friendly/Casual":
      "Conversational style that builds rapport and feels approachable",
    "Inspirational/Motivational":
      "Uplifting content that encourages and empowers the audience",
    "Humorous/Witty":
      "Clever and entertaining approach with appropriate comic elements",
    "Empathetic/Compassionate":
      "Understanding and emotionally connected tone that resonates with feelings",
    "Analytical/Data-Driven":
      "Fact-based approach focusing on statistics, research, and analysis",
    "Persuasive/Argumentative":
      "Compelling content that presents clear arguments and calls to action",
    "Informative/Educational":
      "Clear, instructional tone focused on teaching and explaining concepts",
    "Storytelling/Narrative":
      "Engaging narrative style that creates emotional connections through stories",
    "Neutral/Objective":
      "Balanced, unbiased presentation of information without personal opinion",
    "Authoritative/Expert":
      "Confident, knowledgeable tone that establishes credibility and expertise",
    "Curious/Exploratory":
      "Inquisitive approach that encourages discovery and questioning",
  };
  return descriptions[tone] || tone;
}
module.exports = { getCategoryDescription, getToneDescription };
