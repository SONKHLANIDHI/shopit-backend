const  express = require('express') 
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const app = express()

app.use(express.json()) ; 
app.use(cors());

const storage = multer.memoryStorage(); // Store file in memory as a buffer
const upload = multer({ storage: storage })

const secret = 'jaishreeram' 

// defining mongoose schema  ^^ 

const userSchema = new mongoose.Schema({
    username : String ,
    password : String ,
    cartproducts : [{type : mongoose.Schema.Types.ObjectId , ref :'Shopit'}] ,
    wishlist :  [{type : mongoose.Schema.Types.ObjectId , ref :'Shopit'}] ,
})


const adminSchema = mongoose.Schema({
    username : String , 
    password : String
})

const productSchema = new mongoose.Schema({
  productName: String,
  price: Number,
  description: String,
  stock: Number,
  category: String,
  imageUrl: String,
  tags: [String],
  createdAt: { type: Date, default: Date.now },
});

const recentlyAddedProductSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  addedAt: { type: Date, default: Date.now },
});


const User = mongoose.model('User' , userSchema) ;
const Admin = mongoose.model('Admin' , adminSchema) ;
const Product = mongoose.model('Product', productSchema);
const RecentlyAddedProduct = mongoose.model('RecentlyAddedProduct', recentlyAddedProductSchema);

mongoose.connect('mongodb+srv://harsh:Geetasingh%40098@cluster0.wifoeru.mongodb.net/?retryWrites=true&w=majority', { dbName: "shopit" });

const authenticateJwt = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader) {
      const token = authHeader.split(' ')[1];
      jwt.verify(token, SECRET, (err, user) => {
        if (err) {
          return res.sendStatus(403);
        }
        req.user = user;
        next();
      });
    } else {
      res.sendStatus(401);
    }
  };
  

  app.get('/' , (req,res) => {
    res.json("hello")
  })

  app.post('/admin/signup', (req, res) => {
    const { username, password } = req.body;
    function callback(admin) {
      if (admin) {
        res.status(403).json({ message: 'Admin already exists' });
      } else {
        const obj = { username: username, password: password };
        const newAdmin = new Admin(obj);
        newAdmin.save();
        const token = jwt.sign({ username, role: 'admin' }, SECRET, { expiresIn: '1h' });
        res.json({ message: 'Admin created successfully', token });
      }
  
    }
    Admin.findOne({ username }).then(callback);
  });
  
  app.post('/admin/login', async (req, res) => {
    const { username, password } = req.headers;
    const admin = await Admin.findOne({ username, password });
    if (admin) {
      const token = jwt.sign({ username, role: 'admin' }, SECRET, { expiresIn: '1h' });
      res.json({ message: 'Logged in successfully', token });
    } else {
      res.status(403).json({ message: 'Invalid username or password' });
    }
  });
  
  app.post('/users/signup', async (req, res) => {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (user) {
      res.status(403).json({ message: 'User already exists' });
    } else {
      const newUser = new User({ username, password });
      await newUser.save();
      const token = jwt.sign({ username, role: 'user' }, SECRET, { expiresIn: '1h' });
      res.json({ message: 'User created successfully', token });
    }
  });
  
  app.post('/users/login', async (req, res) => {
    const { username, password } = req.headers;
    const user = await User.findOne({ username, password });
    if (user) {
      const token = jwt.sign({ username, role: 'user' }, SECRET, { expiresIn: '1h' });
      res.json({ message: 'Logged in successfully', token });
    } else {
      res.status(403).json({ message: 'Invalid username or password' });
    }
  });



  // API to add a product
  app.post('/api/products', upload.single('image'), async (req, res) => {
    try {
      const { productName, price, description, stock, category, tags } = req.body;
  
      // Check if 'image' field exists in the form data
      if (!req.file || !req.file.buffer) {
        return res.status(400).json({ error: 'Image file is required' });
      }
  
      // Access the buffer from the file
      const imageUrl = req.file.buffer.toString('base64'); 
  
      const product = new Product({ productName, price, description, stock, category, imageUrl, tags });
      await product.save();

      const recentlyAddedProduct = new RecentlyAddedProduct({ productId: product._id });
      await recentlyAddedProduct.save();
  
      res.status(201).json({ message: 'Product added successfully' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });
  
  
  

//api to retrieve all the products
app.get('/api/products', async (req, res) => {
  try {
    const products = await Product.find();
    res.status(200).json(products);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

//api to retrieve product based on category
app.get('/api/products/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const products = await Product.find({ category });
    res.status(200).json(products);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// API to retrieve product by ID
app.get('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.status(200).json(product);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// ...

// API to edit a product by ID
app.put('/api/products', upload.single('image'), async (req, res) => {
  try {
    const { _id, productName, price, description, stock, category } = req.body;

    // Check if the product with the given ID exists
    const existingProduct = await Product.findById(_id);
    if (!existingProduct) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Update product details
    existingProduct.productName = productName;
    existingProduct.price = price;
    existingProduct.description = description;
    existingProduct.stock = stock;
    existingProduct.category = category;

    // Update image if a new one is provided
    if (req.file) {
      existingProduct.imageUrl = req.file.buffer.toString('base64');
    }

    // Save the updated product
    await existingProduct.save();

    res.status(200).json({ message: 'Product updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/api/recentProducts', async (req, res) => {
  try {
    const recentProducts = await RecentlyAddedProduct.find()
      .sort({ addedAt: -1 }) // Sort in descending order of added time
      .limit(10)
      .populate('productId'); // Populate product details

    const formattedProducts = recentProducts.map((recentProduct) => {
      if (recentProduct.product && recentProduct.product.toObject) {
        return {
          ...recentProduct.product.toObject(),
          addedAt: recentProduct.addedAt,
        };
      } else {
        // Handle the case where recentProduct.product is undefined
        return null;
      }
    });

    // Filter out null values
    const validProducts = formattedProducts.filter(product => product !== null);

    res.status(200).json(validProducts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});



// ...


  app.post('/users/wishlist/product/', authenticateJwt, async (req, res) => {
    const product = await Course.findById(req.courseId);
    console.log(product);
    if (product) {
      const user = await User.findOne({ username: req.user.username });
      if (user) {
        user.purchasedCourses.push(course);
        await user.save();
        res.json({ message: 'product added successfully' });
      } else {
        res.status(403).json({ message: 'User not found' });
      }
    } else {
      res.status(404).json({ message: 'Course not found' });
    }
  });



  app.listen(3000, () => console.log('Server running on port 3000'));