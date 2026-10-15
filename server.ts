import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Initialize Gemini
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// API Routes
app.post('/api/ai/insights', async (req, res) => {
  try {
    const { student, assessments, marks, month, questions } = req.body;

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: 'GEMINI_API_KEY is not configured on the server.' });
    }

    const prompt = `
      You are an AI Mentor Assistant for "Grand Campus Assurance".
      Analyze the following data for student "${student.name}" (ID: ${student.admissionNumber}) for the month of ${month}.
      
      Questions Metadata:
      ${JSON.stringify(questions)}

      Assessments (Spiritual/Behavioural):
      ${JSON.stringify(assessments)}

      Academic/CCE Marks:
      ${JSON.stringify(marks)}

      Based on this data, provide:
      1. A professional summary of the student's performance and wellbeing.
      2. 3-4 Key Strengths.
      3. 2-3 Areas for Improvement.
      4. A "Mentorship Roadmap" with 3-4 actionable steps for the teacher to help the student grow.

      Return the response strictly as a JSON object with the following structure:
      {
        "summary": "string",
        "strengths": ["string"],
        "areasForImprovement": ["string"],
        "roadmap": ["string"]
      }
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
            areasForImprovement: { type: Type.ARRAY, items: { type: Type.STRING } },
            roadmap: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["summary", "strengths", "areasForImprovement", "roadmap"]
        }
      }
    });

    const result = JSON.parse(response.text || '{}');
    res.json(result);
  } catch (error: any) {
    console.error('Gemini Error:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
