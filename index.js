const express = require("express");
const mongoose = require("mongoose");
const Product = require("./models/Product"); 
const multer = require("multer");
const path = require("path");
const cors = require("cors"); 
const app = express();
const router = express.Router();
const PORT = 4000;

app.use(express.json());

require("dotenv").config();
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const corsOptions = {
  origin: ['http://localhost:3000', 'http://127.0.0.1:5173'], // Allow both origins
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type'],
};

app.use(cors(corsOptions)); // Apply the updated CORS configuration



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
]), async (req, res) => {
  console.log("Files received:", req.files);  // Log the uploaded files to check if they are correctly sent
  try {
    const { sku } = req.params; // Get SKU from URL params
    const { productName, quantity, description } = req.body; // Get data from body

    // Find the existing product by SKU
    const existingProduct = await Product.findOne({ sku });
    if (!existingProduct) {
      return res.status(404).json({ error: "Product not found" });
    }

    // Handle image file uploads (if any). Merge new images with existing ones.
    let images = [...existingProduct.images]; // Start with the existing images in the DB
    if (req.files["images"]) {
      const newImages = req.files["images"].map(file => file.path);
      images = [...images, ...newImages]; // Add new images to the existing ones
    }

    // Handle thumbnail update (if a new one is uploaded, otherwise retain the old thumbnail)
    let selectedThumbnail = null;
    if (req.files["thumbnail"]) {
      selectedThumbnail = req.files["thumbnail"][0].path; // If new thumbnail uploaded, use the new path
    } else if (req.body.thumbnail && req.body.thumbnail !== "") {
      selectedThumbnail = req.body.thumbnail; // If existing thumbnail path is provided (unchanged), retain it
    } else {
      // If no new thumbnail and no thumbnail data provided, keep the old thumbnail
      selectedThumbnail = existingProduct.thumbnail;
    }

    // Update the product in the database
    const updatedProduct = await Product.findOneAndUpdate(
      { sku }, // Find product by SKU
      {
        productName,
        quantity,
        description,
        images, // Save the updated images array
        thumbnail: selectedThumbnail, // Save the updated thumbnail
      },
      { new: true } // Return the updated product
    );

    // Respond with the updated product
    res.status(200).json(updatedProduct);
  } catch (err) {
    console.error("Error updating product by SKU:", err);
    res.status(500).json({ error: "Failed to update product", details: err });
  }
});

app.get("/api/search", async (req, res) => {
  const { query } = req.query;
  console.log("Received search query:", query);  // Log the query

  if (!query) {
    return res.status(400).json({ error: "Query parameter is required" });
  }

  try {
    // Construct the search query dynamically
    const products = await Product.find({
      $or: [
        { productName: { $regex: query, $options: "i" } }, // Case-insensitive search for productName
        { description: { $regex: query, $options: "i" } }, // Case-insensitive search for description
        { sku: { $regex: query, $options: "i" } }           // Case-insensitive search for SKU
      ]
    });

    console.log("Search Results:", products); // Log the products to see what is being returned

    if (products.length === 0) {
      return res.status(404).json({ message: "No products found" });
    }

    res.json(products);  // Send matching products back to the client
  } catch (err) {
    console.error("Error fetching products:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});





// Search results API (returns full product details based on query)
app.get('/api/searchResults', async (req, res) => {
  const { query } = req.query; // Get the query from the URL parameters
  
  if (!query) {
    return res.status(400).json({ message: 'Query parameter is required' });
  }

  try {
    // Perform a case-insensitive search for product details
    const products = await Product.find({
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } },
        { sku: { $regex: query, $options: 'i' } },
      ]
    });

    // Return the full product details
    res.json(products);
  } catch (error) {
    console.error('Error fetching search results:', error);
    res.status(500).json({ message: 'Error fetching search results' });
  }
});

// Start the server
mongoose.connect("mongodb+srv://sachini:ecom123@e-commerce-app.ywdc8.mongodb.net/?retryWrites=true&w=majority&appName=E-Commerce-App", { dbName: "e_com_db" })
  .then(() => {
    console.log("Connected to the database successfully");
    app.listen(4000, "localhost", () => {
      console.log("Server is listening on port 4000");
    });
  })
  .catch((err) => {
    console.log("Error connecting to the database:", err);
  });

  module.exports = router;
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });