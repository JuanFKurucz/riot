const router = require('express').Router();
const fs = require("fs");
const getPixels = require("get-pixels");


async function readCaptcha(path){
  return await getPixels(path, async function(err, pixels) {
    if(err) {
      console.log("Bad image path");
      return -1;
    }
    const imageData = pixels.data;
    console.log("got pixels", imageData);
    return 1;
  })
}

const captcha = async (req,res) => {
  let response = {error:true,error_message:"No image"};
  const data = getReqData(req);
  if(checkQuery(data,["apikey"])){
    const apiKey = data.apikey;
    const date = (new Date()).getTime();
    const sql_get = "SELECT id_apikey FROM apikey WHERE code = ?";
    try{
      const result_get = await query(sql_get,[apiKey]);
      const id_apikey = result_get[0].id_apikey;
      for(let f in req.files){
        if(f==="image"){
          const extension = req.files["image"][0].originalname.split(".")[req.files["image"][0].originalname.split(".").length-1];
          const path = 'src/server/uploads/'+apiKey+"-"+date+"."+extension;
          fs.renameSync(req.files["image"][0].path,path);
          const result = await readCaptcha(path);
          console.log(result);
          /*const sql_insert = "INSERT INTO consumption SET ?";
          try{
            const result_insert = await query(sql_insert,{id_apikey,date});
            response = {"error":false,"result":result};
          } catch(e){
            console.log(e);
            response = {"error":true,"result":result};
          }*/
        }
      }
    } catch(e){
      console.log(e);
      response = {error:true,error_message:"Bad apikey"};
    }
  } else {
    response = {error:true,error_message:"Bad parameters"};
  }
  res.send(response);
};


const addEventUpload = upload.fields([{ name: 'image', maxCount: 1 }]);
router.post('/captcha', addEventUpload, captcha);
router.get('/captcha', addEventUpload, captcha);

module.exports = router;
