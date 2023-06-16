const express = require('express');
const app = express();
const jwt = require('jsonwebtoken');
const cors = require('cors');
require('dotenv').config()
const stripe = require('stripe')(process.env.PAYMENT_SECRET_KEY)

const port = process.env.PORT || 5000;

//middleware

app.use(cors());
app.use(express.json());

const verifyJWT = (req, res, next) => {
    const authorization = req.headers.authorization;

    if (!authorization) {
        return res.status(401).send({ error: true, message: 'unauthorized access' });

    }


    // bearer token
    const token = authorization.split(' ')[1];

    jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
        if (err) {
            return res.status(401).send({ error: true, message: 'unauthorized access' })
        }
        req.decoded = decoded;
        next();
    })
}


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
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

        const usersCollection = client.db("frameLabDB").collection("users");
        const classesCollection = client.db("frameLabDB").collection("classes");
        const selectedClassesCollection = client.db("frameLabDB").collection("selectedClasses");
        const paymentCollection = client.db("frameLabDB").collection("payment");



        app.post('/jwt', (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN, {
                expiresIn: '1h'
            })
            res.send({ token })
        })

        // users api

        app.get('/users', async (req, res) => {
            const result = await usersCollection.find().toArray();
            res.send(result)

        })

        app.post('/users', async (req, res) => {
            const user = req.body;
            const query = { email: user.email }
            const existingUser = await usersCollection.findOne(query);
            if (existingUser) {
                return res.send({ message: 'User already exist' })
            }

            const result = await usersCollection.insertOne(user);
            res.send(result)
        })



        // making admin


        app.get('/users/admin/:email', async (req, res) => {
            const email = req.params.email;

            // if (req.decoded.email !== email) {
            //     res.send({ admin: false })
            // }

            const query = { email: email }
            const user = await usersCollection.findOne(query);
            const result = { admin: user?.role === 'admin' }
            res.send(result);
        })

        // instructor

        app.get('/users/instructor/:email', async (req, res) => {
            const email = req.params.email;

            const query = { email: email }
            const user = await usersCollection.findOne(query);
            const result = { instructor: user?.role === 'instructor' }
            res.send(result);
        });


        app.patch('/users/admin/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updateDoc = {

                $set: {
                    role: 'admin'
                },
            };
            const result = await usersCollection.updateOne(filter, updateDoc);
            res.send(result)
        })

        // Making Instructor

        app.patch('/users/instructor/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updateDoc = {

                $set: {
                    role: 'instructor'
                },
            };
            const result = await usersCollection.updateOne(filter, updateDoc);
            res.send(result)
        })


        // Create a new class
        app.post('/classes', async (req, res) => {
            try {
                const { className, classImage, instructorName, instructorEmail, availableSeats, price, status, enrolled } = req.body;
                const result = await classesCollection.insertOne({
                    className,
                    classImage,
                    instructorName,
                    instructorEmail,
                    availableSeats,
                    price,
                    status,
                    enrolled,
                });

                res.send(result);
            } catch (error) {
                console.error('Error creating class:', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        });


        // For instructors, based on instructor email
        app.get('/classes/instructor', async (req, res) => {
            try {
                const email = req.query.email;

                if (!email) {
                    return res.status(400).json({ error: 'Missing email query parameter' });
                }

                const query = { instructorEmail: email };
                const result = await classesCollection.find(query).toArray();
                res.json(result);
            } catch (error) {
                console.error('Error fetching instructor classes:', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        });

        // For admins, all classes
        app.get('/classes/admin', async (req, res) => {
            try {
                const result = await classesCollection.find().toArray();
                res.json(result);
            } catch (error) {
                console.error('Error fetching all classes:', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        });

        app.get('/classes', async (req, res) => {
            try {
              const result = await classesCollection.find().toArray();
              res.json(result);
            } catch (error) {
              console.error('Error fetching all classes:', error);
              res.status(500).json({ error: 'Internal server error' });
            }
          });
          


        app.get('/classes/:id', async (req, res) => {
            const itemId = req.params.id;
            const query = { _id: new ObjectId(itemId) }
            try {
                const result = await classesCollection.findOne(query);
                res.json(result);
            } catch (error) {
                console.error('Error fetching all classes:', error);
                res.status(500).json({ error: 'Internal server error' });
            }


        });



        //Selected Classes

        app.get('/selectedClasses', async (req, res) => {
            const email = req.query.email;
            if (!email) {
                res.send([]);
            }

            const query = { email: email };
            const result = await selectedClassesCollection.find(query).toArray();
            res.send(result);

        })


        app.post('/selectedClasses', async (req, res) => {
            const item = req.body;
            console.log(item);

            const result = await selectedClassesCollection.insertOne(item);
            res.send(result)
        })

        // Delete

        app.delete('/selectedClasses/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };

            const result = await selectedClassesCollection.deleteOne(query);
            res.send(result)
        })


        // approve, deny and feedback

        app.patch('/classes/approve/:id', async (req, res) => {
            const id = req.params.id;
            const info = req.body;
            // console.log(info);
            const filter = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: {
                    ...info
                }
            };
            const result = await classesCollection.updateOne(filter, updateDoc);
            res.send(result);
        });




        app.post('/classes/:id/feedback', async (req, res) => {
            const { id } = req.params;
            const { feedback } = req.body;

            console.log(feedback);
            console.log(id);

            try {
                const result = await classesCollection.findOneAndUpdate(
                    { _id: new ObjectId(id) },
                    { $set: { feedback } },
                    { returnOriginal: false }
                );

                if (result.value) {
                    res.status(200).send({ message: 'Feedback submitted successfully' });
                } else {
                    res.status(404).send({ error: 'Class not found' });
                }
            } catch (error) {
                console.error('Error submitting feedback:', error);
                res.status(500).send({ error: 'Failed to submit feedback' });
            }
        });




    


        // crate payment intent

        app.post('/create-payment-intent', verifyJWT, async (req, res) => {
            const { price } = req.body;
            const amount = Math.round(price * 100);
            console.log(price, amount);
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: 'usd',
                payment_method_types: ["card"]
            });
            res.send({
                clientSecret: paymentIntent.client_secret
            });
        })



        // payment related things
        app.post('/payments', verifyJWT, async (req, res) => {
            const payment = req.body;
            const insertResult = await paymentCollection.insertOne(payment);
        
            const classIds = payment.items.map(id => new ObjectId(id));
            const query = { _id: { $in: classIds } };
            const deleteResult = await selectedClassesCollection.deleteMany(query);
        
            res.send({ insertResult, deleteResult });
        });
        


        app.get('/payment/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };

            const result = await selectedClassesCollection.findOne(query);
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