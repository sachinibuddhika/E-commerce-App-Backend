const express = require("express");
const mongoose = require("mongoose");
const Product = require("./models/Product"); 
const app = express();
require("dotenv").config();

app.use(express.json());


app.post("/add-product", async (req, res) => {
  try {
    const { sku, productName, quantity, description, images } = req.body;

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
