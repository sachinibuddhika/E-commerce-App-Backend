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
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));



// const storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, 'uploads/'); // Store files in the 'uploads/' folder
//   },
//   filename: (req, file, cb) => {
//     // Store only the unique filename without the full path
//     const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
//     cb(null, uniqueSuffix + path.extname(file.originalname)); // Generate filename like "1731472427442-374281621.png"
//   }
// });

// Setup multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Store files in the 'uploads/' folder
  },
  filename: (req, file, cb) => {
    // Store only the unique filename without the full path
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname)); // Generate filename like "1731472427442-374281621.png"
  }
});

const upload = multer({ storage });

//add a new product
app.post("/add-product",  upload.array("images", 5),async (req, res) => {
  console.log("Uploaded files:", req.files); 
  try {
    const { sku, productName, quantity, description,thumbnail  } = req.body;
    // const images = req.files.map((file) => file.path); 
    const images = req.files.map((file) => file.filename);  // Save only the filename, not the full path
    const selectedThumbnail = req.files.find(file => file.originalname === thumbnail)?.filename;

    
    const newProduct = new Product({
      sku,
      productName,
      quantity,
      description,
      images,
      thumbnail: selectedThumbnail,
    });

    await newProduct.save();

    res.status(201).json({ message: "Product added successfully!" });
  } catch (err) {
    res.status(500).json({ error: "Failed to add product", details: err });
  }
});

// Get all products
app.get("/api/products", async (req, res) => {
  try {
    const products = await Product.find(); // Fetch all products from the database
    console.log("Products from DB:", products);
    res.status(200).json(products); // Send the list of products as JSON
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch products", details: err });
  }
});



// Get a single product by SKU
app.get("/product/sku/:sku", async (req, res) => {
  console.log("Requested SKU:", req.params.sku);  // Log the SKU to check it's correct
  try {
    const product = await Product.findOne({ sku: req.params.sku });
    
    if (!product) {
      console.log("Product not found in the database");
      return res.status(404).json({ error: "Product not found" });
    }
    
    res.json(product); // Send the product data if found
  } catch (err) {
    console.log("Error fetching product:", err);
    res.status(500).json({ error: "Failed to fetch product", details: err });
  }
});



app.put("/update-product/sku/:sku", upload.fields([
  { name: "images", maxCount: 5 }, // multiple image files
  { name: "thumbnail", maxCount: 1 }, // single thumbnail image
]), async (req, res)  => {
  console.log("Files received:", req.files);  // Log the uploaded files to check if they are correctly sent
  try {
    const { sku } = req.params; // Get SKU from URL params
    const { productName, quantity, description } = req.body; // Get data from body

    // Handle image file upload
    const images = req.files["images"] ? req.files["images"].map((file) => file.path) : [];
    const selectedThumbnail = req.files["thumbnail"] ? req.files["thumbnail"][0].path : null;


    // Find the product by SKU and update it
    const updatedProduct = await Product.findOneAndUpdate(
      { sku }, // Find product by SKU
      {
        productName,
        quantity,
        description,
        images,
        thumbnail: selectedThumbnail || "", // Update thumbnail if provided
      },
      { new: true } // Return the updated product
    );

    if (!updatedProduct) {
      return res.status(404).json({ error: "Product not found" });
    }

    // Respond with the updated product
    res.status(200).json(updatedProduct);
  } catch (err) {
    console.error("Error updating product by SKU:", err);
    res.status(500).json({ error: "Failed to update product", details: err });
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
