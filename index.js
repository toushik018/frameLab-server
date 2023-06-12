const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config()

const port = process.env.PORT || 5000;

//middleware

app.use(cors());
app.use(express.json());


const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.qesst1e.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();

        const classesCollection = client.db("frameLabDB").collection("classes");
        const selectedClassesCollection = client.db("frameLabDB").collection("selectedClasses");


        // Create a new class
        app.post('/classes', async (req, res) => {
            try {
                const { className, classImage, instructorName, instructorEmail, availableSeats, price, status } = req.body;

                // Insert the class data into the "classes" collection
                const result = await classesCollection.insertOne({
                    className,
                    classImage,
                    instructorName,
                    instructorEmail,
                    availableSeats,
                    price,
                    status,
                });

                res.status(201).json(result.ops[0]);
            } catch (error) {
                console.error('Error creating class:', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        });

        // Classes

        app.get('/classes', async (req, res) => {
            try {

                const classes = await classesCollection.find().toArray();
                res.status(200).json(classes);
            } catch (error) {
                console.error('Error fetching classes:', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        });


        //Selected Classes

        app.post('/selectedClasses', async (req, res) => {
            const item = req.body;
            console.log(item);

            const result = await selectedClassesCollection.insertOne(item);
            res.send(result)
        })


        // Making admin

        app.patch('classes/admin/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new Object(id) };

            const updateDoc = {
                $set: {
                    role: 'admin'
                },
            };

            const result = await classesCollection.updateOne(filter, updateDoc);
            res.send(result)
        })



        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('FrameLab is running')
})

app.listen(port, () => {
    console.log(`FrameLab is running on port ${port}`);
})