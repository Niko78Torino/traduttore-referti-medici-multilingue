// File: netlify/functions/analyze.js

exports.handler = async function (event, context) {
    // Controlla che la richiesta sia di tipo POST
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method Not Allowed' }),
        };
    }

    try {
        // Estrae i dati inviati dal frontend (immagine e lingua)
        const { imageData, mimeType, language } = JSON.parse(event.body);
        
        // Prende la chiave API dalle variabili d'ambiente di Netlify
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            throw new Error("La chiave API di Gemini non è stata configurata sul server.");
        }

        const prompt = `
            Analizza l'immagine di questo referto medico o ricetta in modo approfondito. Il tuo obiettivo è spiegare le problematiche riscontrate al paziente.
            1. **Trascrizione del Contenuto:** Prima di tutto, trascrivi il testo essenziale del documento per dare contesto.
            2. **Identificazione delle Problematiche:** Analizza i valori, le diagnosi o le prescrizioni. Identifica quali sono i punti critici o le problematiche principali (es. valori fuori norma, diagnosi di una patologia, interazioni tra farmaci prescritti).
            3. **Spiegazione Semplice:** Spiega ogni problematica identificata in un linguaggio chiaro, semplice e diretto, come se parlassi a un paziente che non ha conoscenze mediche. Evita il gergo tecnico il più possibile.
            4. **Organizzazione:** Struttura la risposta in formato Markdown con le seguenti sezioni:
                - ### Riepilogo del Contenuto
                - ### Analisi delle Problematiche
                - ### Spiegazione dei Termini Chiave
            Non includere avvisi o disclaimer nella tua risposta, verranno aggiunti dall'applicazione. Se l'immagine non è un documento medico o non è leggibile, rispondi con un messaggio che lo segnali. Usa h3 (###) per i titoli delle sezioni.
            Rispondi esclusivamente nella seguente lingua: ${language}.
        `;

        const payload = {
            contents: [{
                role: "user",
                parts: [
                    { text: prompt },
                    { inlineData: { mimeType: mimeType, data: imageData } }
                ]
            }],
        };

        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

        // Esegue la chiamata all'API di Gemini
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error("Errore dalla API di Gemini:", errorBody);
            return {
                statusCode: response.status,
                body: JSON.stringify({ error: `Errore dall'API di Gemini: ${response.statusText}` }),
            };
        }

        const result = await response.json();

        // Estrae e restituisce il testo della risposta
        if (result.candidates && result.candidates.length > 0 &&
            result.candidates[0].content && result.candidates[0].content.parts &&
            result.candidates[0].content.parts.length > 0) {
            const text = result.candidates[0].content.parts[0].text;
            return {
                statusCode: 200,
                body: JSON.stringify({ analysis: text }),
            };
        } else {
             if (result.promptFeedback) {
                 console.error("Prompt Feedback:", result.promptFeedback);
                 return {
                    statusCode: 400,
                    body: JSON.stringify({ error: "L'analisi è stata bloccata a causa di restrizioni di sicurezza." }),
                 };
            }
            return {
                statusCode: 500,
                body: JSON.stringify({ error: "La risposta dell'API non è valida o è vuota." }),
            };
        }

    } catch (error) {
        console.error('Errore nella funzione serverless:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message }),
        };
    }
};
