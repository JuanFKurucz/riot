const express = require('express'),
      bodyParser = require('body-parser'),
      app     = express(),
      mysql      = require('mysql'),
      connection = mysql.createConnection({
        host     : 'remotemysql.com',
        user     : 'LJsL8icDOA',
        password : 'z3DK4A8DDj',
        database : 'LJsL8icDOA',
        port     : '3306'
      });
const util = require('util');
const multer  = require('multer');
global.upload = multer({ dest: __dirname+'/tmp/'});

async function start(){
  connection.connect();
  global.db = connection;
  global.query = util.promisify(connection.query).bind(connection);

  global.getReqData = (req) =>{
    let response = null;
    if(req.method.toUpperCase() == "POST"){
      response = {};
      for (var property in req.body) {
        response[property] = req.body[property];
      }
    } else if(req.method.toUpperCase() == "GET") {
      response = req.query;
    }
    return response;
  };
  global.checkQuery = (object,querys) => {
    const keys = Object.keys(object);
    let bool = false;
    if(querys.length === keys.length){
      bool = true;
      const querysLength = querys.length;
      for(let q = 0; q<querysLength; q++){
        const key = querys[q];
        if(keys.indexOf(key) === -1){
          bool = false;
          break;
        }
      }
    }
    return bool;
  };

  function twoDigits(d) {
      if(0 <= d && d < 10) return "0" + d.toString();
      if(-10 < d && d < 0) return "-0" + (-1*d).toString();
      return d.toString();
  }
  Date.prototype.toMysqlFormat = function() {
      return this.getUTCFullYear() + "-" + twoDigits(1 + this.getUTCMonth()) + "-" + twoDigits(this.getUTCDate()) + " " + twoDigits(this.getUTCHours()) + ":" + twoDigits(this.getUTCMinutes()) + ":" + twoDigits(this.getUTCSeconds());
  };


  //app.use(express.json());

  app.use(express.static('dist'));
  app.use(bodyParser.urlencoded({ extended: false }));
  app.use(bodyParser.json());
  app.use(require('./routes'));
  app.get('/', function(req, res) {res.sendFile(__dirname+'/index.html')});
  app.listen(8080, () => console.log('Listening on port 8080!'));
}

start();
