require("dotenv").config();
const cloudinary = require("cloudinary").v2;

console.log("Environment variables:");
console.log("CLOUDINARY_CLOUD_NAME:", process.env.CLOUDINARY_CLOUD_NAME);
console.log("CLOUDINARY_API_KEY:", process.env.CLOUDINARY_API_KEY);
console.log("CLOUDINARY_API_SECRET:", process.env.CLOUDINARY_API_SECRET);

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

console.log("Cloudinary config:", cloudinary.config());

// Test connection
cloudinary.api
  .ping()
  .then((result) => {
    console.log("Cloudinary connection successful:", result);
  })
  .catch((error) => {
    console.error("Cloudinary connection failed:", error);
  });
