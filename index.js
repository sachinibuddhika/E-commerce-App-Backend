const express = require("express");
const mongoose = require("mongoose");
const Product = require("./models/Product"); 
const multer = require("multer");
const path = require("path");
const cors = require("cors"); 
const app = express();
require("dotenv").config();
app.use(cors());
app.use(express.json());


// Setup multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/"); // Directory to save uploaded files
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname)); // Generate unique filenames
  },
});

const upload = multer({ storage: storage });


app.post("/add-product",  upload.array("images", 5),async (req, res) => {
  console.log("Uploaded files:", req.files); 
  try {
    const { sku, productName, quantity, description } = req.body;
    const images = req.files.map((file) => file.path); // Save the file paths to MongoDB

    const newProduct = new Product({
      sku,
      productName,
      quantity,
      description,
      images,
    });

    await newProduct.save();

    res.status(201).json({ message: "Product added successfully!" });
  } catch (err) {
    res.status(500).json({ error: "Failed to add product", details: err });
  }
});

// Start the server
mongoose.connect(process.env.MONG_URI, { dbName: "e_com_db" })
  .then(() => {
    console.log("Connected to the database successfully");
    app.listen(4000, "localhost", () => {
      console.log("Server is listening on port 4000");
    });
  })
  .catch((err) => {
    console.log("Error connecting to the database:", err);
  });
