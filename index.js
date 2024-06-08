const express = require("express");

const app = express();

const port = process.env.PORT || 3000;

const session = require("express-session");

const bodyParser = require("body-parser");

const path = require("path");

const cors = require("cors");

const mysql = require("mysql2");

const cookieParser = require("cookie-parser");

const crypto = require("crypto");

app.use(express.static("public"));

app.use(cookieParser());

/*****************************************************

* Menambahkan 'Sequelize'

*****************************************************/
var user_id = 0;

const {
  Sequelize,
  DataTypes,
  UniqueConstraintError,
  Op,
} = require("sequelize");

// const sequelize = new Sequelize("db_fin", "root", "12345", {
//   host: "localhost",

//   dialect: "mysql",
// });

const sequelize = new Sequelize(process.env.JAWSDB_URL, {

  dialect: "mysql",
});

sequelize
  .authenticate()
  .then(() => {
    console.log("Koneksi ke database berhasil.");
  })
  .catch((error) => {
    console.log("Tidak dapat terhubung ke database: ", error);
  });

const Users = sequelize.define("user", {
  id: {
    type: DataTypes.INTEGER,

    autoIncrement: true,

    primaryKey: true,
  },

  name: {
    type: DataTypes.STRING,
  },

  password: {
    type: DataTypes.STRING,
  },

  email: {
    type: DataTypes.STRING,

    unique: true,
  },
});

const Carts = sequelize.define("cart", {
  id: {
    type: DataTypes.INTEGER,

    autoIncrement: true,

    primaryKey: true,
  },

  itemname: {
    type: DataTypes.STRING,
  },

  quantity: {
    type: DataTypes.INTEGER,
  },

  typeid: {
    type: DataTypes.INTEGER,

    unique: true,
  },

  userid: {
    type: DataTypes.INTEGER,
    references: {
      model: "Users", // Name of the referenced table
      key: "id", // Name of the referenced column
    },
    allowNull: false,
  },

  status: {
    type: DataTypes.INTEGER,
  },
});

const ItemType = sequelize.define("itemtype", {
  id: {
    type: DataTypes.INTEGER,

    autoIncrement: true,

    primaryKey: true,
  },

  name: {
    type: DataTypes.STRING(100),
  },

  image: {
    type: DataTypes.STRING(1000),
  },

  description: {
    type: DataTypes.STRING(1000),
  },
});

const Items = sequelize.define("item", {
  id: {
    type: DataTypes.INTEGER,

    autoIncrement: true,

    primaryKey: true,
  },

  name: {
    type: DataTypes.STRING,
  },

  typeid: {
    type: DataTypes.INTEGER,
    references: {
      model: ItemType,
      key: "id",
    },
  },

  quantity: {
    type: DataTypes.INTEGER,
  },

  image: {
    type: DataTypes.STRING(1000),
  },

  price: {
    type: DataTypes.INTEGER,
  },

  description: {
    type: DataTypes.STRING(1000),
  },
});

Carts.belongsTo(Users, { foreignKey: "userid" });
// Items.hasMany(Carts, { foreignKey: "id" });
Carts.belongsTo(Items, { foreignKey: "itemid" });
Items.belongsTo(ItemType, { foreignKey: "typeid" });

sequelize
  .sync()
  .then(() => {
    console.log("Synced.");
  })
  .catch((error) => {
    console.log("Tidak dapat membuat tabel: ", error);
  });

/************** end 'Sequelize' *********************** */

app.use(express.json());

app.use(
  express.urlencoded({
    extended: false,
  })
);

app.use(cors());

app.use(express.static("public"));

app.set("view engine", "ejs"); // menggunakan EJS sebagai template engine

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.set("views", path.join(__dirname, "public"));
// lokasi direktori views (optional, jika menggunakan direktori selain default)

const data = {
  title: "Halaman Utama",
};

app.get("/", (req, res) => {
  res.render("index", { data });
});

app.use(
  session({
    secret: crypto.randomBytes(32).toString("hex"),
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 60000, sameSite: "None" },
  })
);

// Session
// app.get("/profile", (req, res) => {
//   const userId = req.session.userId;

//   res.send(`User ID: ${userId}`);
// });

app.get("/get-cookie", (req, res) => {
  // Access cookies from the request object
  const userIdCookie = req.cookies.userId;

  if (userIdCookie !== undefined) {
    user_id = userIdCookie;
  }
  // Do something with the cookie value
  console.log(userIdCookie);

  // Send a response
  res.send(userIdCookie);
});

app.get("/product/:productId", async (req, res) => {
  const productId = req.params.productId;

  try {
    // Fetch product details based on productId from database using Sequelize
    const product = await Items.findByPk(productId, {
      include: ItemType,
    });
    // Check if product exists
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    // Send product details as response
    res.json(product);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Route to handle login logic
app.post("/login", async (req, res) => {
  const { email, password, rememberMe } = req.body;

  try {
    // Query the database for the user with the provided email
    const user = await Users.findOne({ where: { email: email } });

    // If user is not found or password doesn't match, send error response
    if (!user || user.password !== password) {
      return res.json({ success: false, message: "Invalid email or password" });
    }

    // If email and password match, create a session and send success response
    req.session.userId = user.id;

    user_id = user.id;

    if (rememberMe) {
      const expirationDate = new Date();
      expirationDate.setTime(expirationDate.getTime() + 1 * 60 * 60 * 1000); // Add 1 hour in milliseconds
      res.cookie("userId", user.id, {
        expires: expirationDate,
        httpOnly: true,
        secure: true,
        sameSite: "Lax",
        path: "/",
      });
    }

    res.json({ success: true, userId: user.id });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred. Please try again later.",
    });
  }
});

app.get("/checkSession", (req, res) => {
  // Check if userId is set in the session
  res.json(user_id);
});

// Route to handle logout logic
app.get("/logout", (req, res) => {
  // Clear the session and cookie
  user_id = 0;
  req.session.destroy((err) => {
    if (err) {
      console.error("Error destroying session:", err);
      res.status(500).json({
        success: false,
        message: "An error occurred while logging out.",
      });
    } else {
      // Expire the userId cookie
      res.clearCookie("userId");
      res.json({ success: true, message: "Logout successful." });
    }
  });
});
app.post("/addUser", async (req, res) => {
  try {
    // Extract data from the request body
    const { name, email, password } = req.body;

    // Insert data into the database
    const user = await Users.create({
      name,
      email,
      password,
    });

    // Send response
    res.status(201).json({ message: "User added successfully", user });
  } catch (error) {
    console.error("Error adding user:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/carousel-data", async (req, res) => {
  const data = await ItemType.findAll({});

  if (data) {
    res.send(data);
  } else {
    res.status(500).send({
      message: "Terjadi kesalahan pada proses pengambilan data",
    });
  }
});

app.get("/search", async (req, res) => {
  const query = req.query.query;

  if (query === "user") {
    const data = await Users.findAll({});
    if (data) {
      res.send(data);
    } else {
      res.status(500).send({
        message: "Terjadi kesalahan pada proses pengambilan data",
      });
    }
  } else if (query === "item") {
    const data = await Items.findAll({});
    if (data) {
      res.send(data);
    } else {
      res.status(500).send({
        message: "Terjadi kesalahan pada proses pengambilan data",
      });
    }
  } else if (query === "itemtype") {
    const data = await ItemType.findAll({});
    if (data) {
      res.send(data);
    } else {
      res.status(500).send({
        message: "Terjadi kesalahan pada proses pengambilan data",
      });
    }
  } else if (query === "cart") {
    const data = await Carts.findAll({});
    if (data) {
      res.send(data);
    } else {
      res.status(500).send({
        message: "Terjadi kesalahan pada proses pengambilan data",
      });
    }
  } else {
    response = { error: "No results found" };
  }
});

app.post("/selected-item", async (req, res) => {
  const productId = req.body.productId;

  try {
    // Fetch product details based on productId from database using Sequelize
    const product = await Items.findByPk(productId);

    // Send product details as response
    res.json(product);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/daftar", (req, res) => {
  const query = req.query.query;
  console.log("Received query parameter:", query); // Log the query parameter
  // res.render("daftar", { category: query });

  const filePath = path.join(__dirname, "public", "daftar.html");
  const queryParams = new URLSearchParams(query).toString();
  const redirectUrl = `/daftar.html?${queryParams}`; // Construct the redirect URL with query parameters
  res.redirect(redirectUrl);
});

app.get("/cart", async (req, res) => {
  try {
    const cartItems = await Carts.findAll({
      where: { userid: user_id },
      include: Items,
    });

    const response = cartItems.map((item) => ({
      id: item.id,
      name: item.itemname,
      image: item.item.image,
      quantity: item.quantity,
      price: item.item.price,
      status: item.status,
    }));

    res.json(response);
  } catch (err) {
    console.error("Error fetching cart items:", err);
    res.status(500).json({ error: "Failed to fetch cart items" });
  }
});

app.post("/updateStatus", async (req, res) => {
  // Get user ID from query parameters

  if (!user_id) {
    return res.status(400).json({ error: "User ID is required." });
  }

  try {
    // Update status for rows belonging to the specified user
    await Carts.update(
      { status: 1 }, // Update fields
      { where: { userid: user_id } } // Condition
    );
    res.status(200).json({ message: "Status updated successfully." });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ error: "An error occurred while updating status. id" + user_id });
  }
});

app.post("/updateRowStatus", async (req, res) => {
  // Get user ID and cart ID from request body
  const { cart_id, statusNew } = req.body;

  // Check if user ID and cart ID are provided
  if (!cart_id) {
    return res.status(400).json({ error: "User ID and Cart ID are required." });
  }

  try {
    // Update status for the specified cart belonging to the user
    const [updatedRowsCount] = await Carts.update(
      { status: statusNew }, // Update fields
      { where: { id: cart_id } } // Condition
    );

    if (updatedRowsCount === 0) {
      return res.status(404).json({ error: "Cart not found for the user." });
    }

    res.status(200).json({ message: "Status updated successfully." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "An error occurred while updating status." });
  }
});

// app.get("/data", async (req, res) => {
//   const data = await Customer.findAll({});

//   if (data) {
//     res.send(data);
//   } else {
//     res.status(500).send({
//       message: "Terjadi kesalahan pada proses pengambilan data",
//     });
//   }
// });

app.post("/addData", async (req, res) => {
  try {
    const tableName = req.query.query;
    console.log("Db table:", tableName);

    const tableAttributes = Object.keys(req.body);
    console.log("Table Attributes:", tableAttributes);

    // Assuming you have sequelize models defined for each table
    const model = sequelize.models[tableName];

    // Check if the model exists
    if (!model) {
      return res.status(400).json({ error: "Invalid table name" });
    }

    // Create a new record in the database
    const newData = await model.create(req.body, {
      fields: tableAttributes,
    });

    res.status(201).json({ message: "Data added successfully", data: newData });
  } catch (error) {
    if (error instanceof UniqueConstraintError) {
      return res.status(400).json({ error: "Email already exists" });
    }
    console.error("Error adding data:", error);
    res.status(500).json({ error: "Error adding data" });
  }
});

app.post("/carousel-data-insert", async (req, res) => {
  const data = req.body;

  console.log(data);

  const it = await ItemType.create(data);

  if (it) {
    res.json({
      result: it,

      message: "ItemType baru berhasil ditambahkan!",
    });
  } else {
    res.status(404).send({
      message: "Terjadi kesalahan pada saat melakukan input data customer",
    });
  }
});

app.post("/delete", async (req, res) => {
  const { id, query } = req.body;

  try {
    let result;

    if (query === "user") {
      result = await Users.destroy({ where: { id } });
    } else if (query === "item") {
      result = await Items.destroy({ where: { id } });
    } else if (query === "itemtype") {
      result = await ItemType.destroy({ where: { id } });
    } else if (query === "cart") {
      result = await Carts.destroy({ where: { id } });
    } else {
      return res
        .status(400)
        .json({ success: false, message: "Invalid query specified." });
    }

    if (result > 0) {
      res.json({ success: true });
    } else {
      res.json({ success: false, message: "No matching document found." });
    }
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while deleting the document.",
    });
  }
});

app.get("/getData", async (req, res) => {
  const { id, query } = req.query;

  try {
    // Fetch data based on id and query
    let data;

    // Example using Sequelize
    if (query === "user") {
      data = await Users.findByPk(id);
    } else if (query === "item") {
      data = await Items.findByPk(id);
    } else if (query === "itemtype") {
      data = await ItemType.findByPk(id);
    } else if (query === "cart") {
      data = await Carts.findByPk(id);
    } else {
      return res
        .status(400)
        .json({ success: false, message: "Invalid query specified." });
    }

    if (data) {
      res.json({ success: true, data });
    } else {
      res.json({ success: false, message: "No data found for editing." });
    }
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while fetching data for editing.",
    });
  }
});

app.post("/update", async (req, res) => {
  const { ids, query, payloads } = req.body;
  // const { id, query } = req.query;
  // const payloads= req.body;

  let model;

  // Choose the appropriate model based on the query
  switch (query) {
    case "user":
      model = Users;
      break;
    case "item":
      model = Items;
      break;
    case "itemtype":
      model = ItemType;
      break;
    case "cart":
      model = Carts;
      break;
    default:
      return res
        .status(400)
        .json({ success: false, message: "Unsupported query" });
  }

  try {
    const [updatedRowsCount, updatedRows] = await model.update(payloads, {
      where: { id: ids },
    });

    // Handle the result of the update operation
    if (updatedRowsCount > 0) {
      // Rows were updated successfully
      console.log(`Updated ${updatedRowsCount} rows for query "${query}"`);
      res.status(200).json({
        success: true,
        message: `Updated ${updatedRowsCount} rows for query "${ids} ${query} ${payloads}"`,
        updatedRows: updatedRows,
      });
    } else {
      // No rows were updated
      console.log(`No rows were updated for query "${payloads}"`);
      res.status(404).json({
        success: false,
        message: `No rows were updated for query " ${ids} ${query} ${payload}"`,
        updatedRows: updatedRows,
      });
    }
  } catch (error) {
    // Handle errors
    console.error(`Error updating data for query "${query}":`, error);
    res.status(500).json({
      success: false,
      message: `Error updating data for query "${query}"`,
      error: error.message,
    });
  }
});

app.post("/users-data-insert", async (req, res) => {
  const data = req.body;

  console.log(data);

  const it = await Users.create(data);

  if (it) {
    res.json({
      result: it,

      message: "ItemType baru berhasil ditambahkan!",
    });
  } else {
    res.status(404).send({
      message: "Terjadi kesalahan pada saat melakukan input data customer",
    });
  }
});

app.get("/showColumn", async (req, res) => {
  try {
    const tableName = req.query.query.toLowerCase();
    console.log("Db table:" + tableName);

    // Check if the model for the specified table exists
    if (!sequelize.models[tableName]) {
      throw new Error("Table not found");
    }

    // Use Sequelize to fetch column names
    const tableAttributes = await sequelize.models[tableName].describe();

    // Extract column names from the table attributes
    const excludedColumns = ["id", "createdAt", "updatedAt"];
    const columns = Object.keys(tableAttributes).filter(
      (column) => !excludedColumns.includes(column)
    );
    // Send the column names back to the client
    res.json({ columns });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Error retrieving column information" });
  }
});

const getJoinedTableColumns = async () => {
  try {
    const cartItems = await getCartWithProductImages();
    if (cartItems.length > 0) {
      return Object.keys(cartItems[0]);
    } else {
      return [];
    }
  } catch (err) {
    console.error("Error getting columns:", err);
    throw err;
  }
};

app.get("/item/:id", async (req, res) => {
  const itemId = req.params.id;

  try {
    const item = await Items.findByPk(itemId);

    if (item) {
      res.send(item);
    } else {
      res.status(404).send({ message: "Item not found" });
    }
  } catch (error) {
    console.error("Error fetching Item:", error);
    res.status(500).send({ message: "Internal server error" });
  }
});

app.get("/getUserData", async (req, res) => {
  try {
    const userId = req.query.id; // Assume you pass the user ID as a query parameter
    const user = await Users.findByPk(userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" + userId });
    }

    // Send back the user data (excluding the password for security reasons)
    res.json({
      name: user.name,
      email: user.email,
    });
  } catch (error) {
    console.error("Error fetching user data:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/searchByDescription", async (req, res) => {
  const searchQuery = req.query.query;

  try {
    const items = await Items.findAll({
      where: {
        description: {
          [Op.like]: `%${searchQuery}%`, // Case-sensitive search using LIKE
        },
      },
      // Set collation for the entire query to make it case-insensitive
      collate: "utf8mb4_general_ci",
    });
    res.json(items);
  } catch (error) {
    console.error("Error fetching items by description:", error);
    res.status(500).send("Server error");
  }
});

app.listen(port, () =>
  console.log(
    `Server berjalan pada port ${port}; ` +
      "tekan Ctrl-C untuk menghentikan Server..."
  )
);
