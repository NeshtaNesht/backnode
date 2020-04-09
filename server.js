const mysql = require("mysql2");
const express = require("express");
const expressHbs = require('express-handlebars');
const bodyParser = require("body-parser");
const hbs = require('hbs');
const fs = require("fs");
const app = express();

//app.use(bodyParser.urlencoded({extended: true}));
const urlencodedParser = bodyParser.urlencoded({extended: false});
app.use(bodyParser.json());
hbs.registerPartials(__dirname + '/views/partials')
app.set("view engine", "hbs");
app.engine(
  'hbs',
  expressHbs({
    layoutsDir: 'views/layouts',
    defaultLayout: 'layout',
    extname: 'hbs',
    helpers: require("./public/js/helpers.js").helpers
  })
);

const pool = mysql.createPool({
  connectionLimit: 5,
  host: "localhost",
  user: "root",  
  database: "webservis",
  dateStrings: "date"
});

let categories = {};
let user = "Неавторизованный пользователь";
let user_group = {};
let addMaterial = "";
app.get("/", (req, res) => {
  pool.query("SELECT n.*, cat.* FROM news as n INNER JOIN categories as cat ON cat.id = n.id_category", (err, data1) => {
    if (err) return console.log(err);      
    pool.query("SELECT * FROM categories", (err, data2) => {
      categories = data2;      
      res.render("index.hbs", {
        news: data1,
        categories: categories,
        user: user,
        user_group: user_group,
      });
    });      
  });  
});

app.get("/articles", (req, res) => {
  pool.query("SELECT n.*, cat.* FROM articles as n INNER JOIN categories as cat ON cat.id = n.id_category", (err, data1) => {
    if (err) return console.log(err);      
    pool.query("SELECT * FROM categories", (err, data2) => {
      categories = data2;      
      res.render("articles.hbs", {
        news: data1,
        categories: categories,
        user: user,
        user_group: user_group,
      });
    });      
  });  
});

app.get("/newscat/:name", (req, res) => {
  const nameCategory = req.params.name;
  pool.query(
    "SELECT n.*, cat.name FROM news as n INNER JOIN categories as cat ON cat.id = n.id_category WHERE id_category=(SELECT id FROM categories WHERE name=?)", 
    [nameCategory], 
    (err, data) => {
      if (err) return console.log(err);
      res.render("index.hbs", {
        news: data, 
        categories: categories,
        user: user,
        user_group: user_group,
      })
    });
});

app.get("/articlecat/:name", (req, res) => {
  const nameCategory = req.params.name;
  pool.query(
    "SELECT a.*, cat.name FROM articles as a INNER JOIN categories as cat ON cat.id = a.id_category WHERE id_category=(SELECT id FROM categories WHERE name=?)", 
    [nameCategory], 
    (err, data) => {
      if (err) return console.log(err);
      res.render("articles.hbs", {
        news: data, 
        categories: categories,
        user: user,
        user_group: user_group,
      })
    });
});

app.get("/:namePage", (req, res) => {
  const namePage = req.params.namePage;
  pool.query(
    "SELECT text FROM pages WHERE name = ?", [namePage], (err, data) => {
      if (err) return console.log(err);
      res.render(namePage+".hbs", {
        data: data,
        categories: categories,
        user: user,
        user_group: user_group,
      });
    }
  );
});

app.get("/newsread/:id", (req, res) => {
  const id = req.params.id;
  pool.query("SELECT * FROM news WHERE id = ?", [id], (err, data) => {
    if (err) return console.log(err);
    console.log(data);-
    res.render("newsread.hbs", {
      news: data,
      categories: categories,
      user: user,
      user_group: user_group,   
    });
  });  
});

app.get("/articlesread/:id", (req, res) => {
  const id = req.params.id;
  pool.query("SELECT * FROM articles WHERE id = ?", [id], (err, data) => {
    if (err) return console.log(err);
    console.log(data);
    res.render("newsread.hbs", {
      news: data,
      categories: categories,
      user: user,
      user_group: user_group,   
    });
  });  
});

app.post("/addmaterial", urlencodedParser, (req, res) => {  
  let table = req.body.type == "Новость" ? "news" : "articles";
  let id_category = {};
  pool.query("SELECT * FROM categories WHERE name = ?", [req.body.category], (err, data) => {
    if (err) return console.log("Ошибка выбора категории: " + err);
    id_category = data[0].id;
    console.log(id_category);
    pool.query(
      "INSERT INTO " + table +" (zagolovok, date, text, id_category) VALUES (?,?,?,?)", 
      [req.body.zagolovok, new Date(), req.body.text, id_category], (err, data2) => {
        if (err) { 
          res.render("addmaterial.hbs", {
            materialAdded: false
          })
          return console.log(err);
        }        
        res.render("addmaterial.hbs", {
          materialAdded: true,
          categories: categories,
          user: user,
          user_group: user_group,   
        })
      }
    ); 
  });  
});

app.post("/addcategory", urlencodedParser, (req, res) => {
  pool.query(
    "INSERT INTO categories (name) VALUES (?)", [req.body.name], (err, data) => {
      if (err) { 
        res.render("addcategory.hbs", {
          categoryAdded: false
        })
        return console.log(err);
      }
      res.render("addcategory.hbs", {
        categoryAdded: true,
        categories: categories,
        user: user,
        user_group: user_group,   
      });
    }
  )
});

app.post("/auth", urlencodedParser, (req, res) => {
  const login = req.body.login;
  const password = req.body.password;
  let no_auth = false;
  pool.query(
    "SELECT u.*, r.* FROM users as u INNER JOIN roles as r ON r.id = u.id_role WHERE u.username = ? AND u.password = ?", [login, password], (err, data) => {
      if (err) return console.log(err);
      if (data.length < 1) {
        return res.render("auth.hbs", {
          no_auth: true,
          categories: categories,
          user: user,
          no_auth: no_auth
        });
      }
      user = "Вы вошли как " + data[0].username + '\n' + "Группа: " + data[0].name;     
      user_group = data[0].name;
      
      res.render("index.hbs", {
        categories: categories,
        user: user,
        user_group: user_group,
        no_auth: no_auth
      });
    }
    );
});

app.use(express.static(__dirname + '/public'));

app.listen(3000, () => {
  console.log("Work on port 3000");
})