const express = require('express');
const connectDB = require('./Config/db');

const app = express();

// Connect DataBase
connectDB();

//Init Middleware
app.use(express.json({extended : false}));

app.get('/',(req,res) =>res.send('API Running'));

//Define Routes
app.use('/api/users', require('./Routes/API/users'));
app.use('/api/auth', require('./Routes/API/auth'));
app.use('/api/posts', require('./Routes/API/posts'));
app.use('/api/profile', require('./Routes/API/profile'));


const PORT = process.env.PORT ||  5000;

app.listen(PORT, ()=> console.log(`Server started on port ${PORT}`));