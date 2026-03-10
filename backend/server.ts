import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import analyzeRoute from './routes/analyze.ts';
import progressRoute from './routes/progress.ts';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// health route
app.get("/", (req, res) => {
    res.send("Sonara backend running 🚀");
});

// routes
app.use('/analyze', analyzeRoute);
app.use('/', progressRoute);

// start server
app.listen(port, () => {
    console.log(`Sonara backend listening at http://localhost:${port}`);
});