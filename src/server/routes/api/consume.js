const router = require('express').Router();
const fs = require("fs");
const getPixels = require("get-pixels");
//const savePixels = require("save-pixels");

function cleanCord(imageData,x,y){
  let i = x*4 + y*imageData.shape[0]*4;
  imageData.data[i]=0;
  imageData.data[i+1]=0;
  imageData.data[i+2]=0;
  imageData.data[i+3]=0;
}

function cleanLine(imageData,y){
  for(let x=0;x<imageData.shape[0];x++){
    cleanCord(imageData,x,y);
  }
}

function cleanRow(imageData,x){
  for(let y=0;y<imageData.shape[1];y++){
    cleanCord(imageData,x,y);
  }
}

function isColor(color,data,tol=0){
  let bool = (Math.abs(data[0]-color[0])<=tol && Math.abs(data[1]-color[1])<=tol && Math.abs(data[2]-color[2])<=tol);
  if(color.length>=4 && data.length>=4){
    bool = bool && Math.abs(data[3]-color[3])<=tol;
  }
  return bool;
}

function insideCords(cord,x,y){
  for(let yC in cord){
    if(x >= cord[yC].min && x<= cord[yC].max && yC == y){
      return true;
    }
  }
  return false;
}

function getStringCord(stringCord,cord){
  if(cord==="x"){
    return parseInt(stringCord.split(",")[0]);
  } else {
    return parseInt(stringCord.split(",")[1]);
  }
}

const f = (a, b) => [].concat(...a.map(d => b.map(e => [].concat(d, e))));
const cartesian = (a, b, ...c) => (b ? cartesian(f(a, b), ...c) : a);


function round5(x){
    return Math.ceil(parseInt(x)/5)*5;
}


function getColorsCoordinates(imageData,cords,asd=null){
  let colors={};
  for(y=cords.topLeft.y;y<=cords.bottomRight.y;y++){
    for(x=cords.topLeft.x;x<+cords.bottomRight.x;x++){
      let i = x*4 + y*imageData.shape[0]*4;
      let r=round5(imageData.data[i]);
      let g=round5(imageData.data[i+1]);
      let b=round5(imageData.data[i+2]);
      if(r<200 && g<200 && b<200){
        let color = r+","+g+","+b;
        if(!colors.hasOwnProperty(color)){
          colors[color]=1;
        } else {
          colors[color]++;
        }
      }
        if(asd!=null){
          imageData.data[i]=asd[0];
          imageData.data[i+1]=asd[1];
          imageData.data[i+2]=asd[2];
        }
    }
  }
  return colors;
}

async function readCaptcha(path){
  return await getPixels(path, async function(err, pixels) {
    if(err) {
      return -1;
    }
    const imageData = pixels;
    const imageDataLength = imageData.data.length;

    let x = -1;
    let y = -1;

    let gridVertical = [];
    let gridHorizontal = [];
    let boolWhite = false;
    let countTop = 10;
    for(y=0;y<imageData.shape[0];y++){
      let whiteCount=0;
      for(x=0;x<imageData.shape[1];x++){
        let i = x*4 + y*imageData.shape[0]*4;
        if(boolWhite===false){
          if( isColor([255,255,255],[imageData.data[i],imageData.data[i+1],imageData.data[i+2]],5) ){
            whiteCount++;
          } else {
            whiteCount=0;
          }
          if(whiteCount>countTop){
            gridHorizontal.push((x-countTop)+","+(y));
            boolWhite=true;
            whiteCount=0;
            break;
          }
        } else {
          if( isColor([255,255,255],[imageData.data[i],imageData.data[i+1],imageData.data[i+2]],5) ){
            whiteCount++;
          }
        }
      }
      if(gridHorizontal.indexOf((x-countTop)+","+(y)) ===-1 && boolWhite===true && whiteCount<countTop){
        gridHorizontal.push((x-countTop)+","+(y));
        whiteCount=0;
        boolWhite=false;
      }
    }

    boolWhite = false;

    for(x=0;x<imageData.shape[0];x++){
      let whiteCount=0;
      for(y=0;y<imageData.shape[1];y++){
        let i = x*4 + y*imageData.shape[0]*4;
        if(boolWhite===false){
          if( isColor([255,255,255],[imageData.data[i],imageData.data[i+1],imageData.data[i+2]],5) ){
            whiteCount++;
          } else {
            whiteCount=0;
          }
          if(whiteCount>countTop){
            gridVertical.push((x)+","+(y-countTop));
            boolWhite=true;
            whiteCount=0;
            break;
          }
        } else {
          if( isColor([255,255,255],[imageData.data[i],imageData.data[i+1],imageData.data[i+2]],5) ){
            whiteCount++;
          }
        }
      }
      if(gridVertical.indexOf((x)+","+(y-countTop)) ===-1 && boolWhite===true && whiteCount<countTop){
        gridVertical.push((x)+","+(y-countTop));
        whiteCount=0;
        boolWhite=false;
      }
    }
    let referenceBox = {
      topLeft: {
        x:getStringCord(gridHorizontal[0],"x"),
        y:getStringCord(gridHorizontal[0],"y")
      },
      bottomLeft: {
        x:getStringCord(gridHorizontal[0],"x"),
        y:getStringCord(gridHorizontal[1],"y")
      },
      topRight: {
        x:getStringCord(gridHorizontal[0],"x")+(Math.abs(getStringCord(gridHorizontal[0],"y")-getStringCord(gridHorizontal[1],"y"))),
        y:getStringCord(gridHorizontal[0],"y")
      },
      bottomRight: {
        x:getStringCord(gridHorizontal[0],"x")+(Math.abs(getStringCord(gridHorizontal[0],"y")-getStringCord(gridHorizontal[1],"y"))),
        y:getStringCord(gridHorizontal[1],"y")
      }
    }
    let colorSample = getColorsCoordinates(imageData,referenceBox);
    let horizontalDistance = [];
    let verticalDistance = [];
    let yVertex = [];
    let xVertex = [];
    for(let h=2;h<gridHorizontal.length;h+=2){
      if(h+1<gridHorizontal.length){
        horizontalDistance.push(Math.abs(getStringCord(gridHorizontal[h],"y")-getStringCord(gridHorizontal[h+1],"y")));
      }
      yVertex.push(getStringCord(gridHorizontal[h],"y"));
    }
    for(let h=0;h<gridVertical.length;h+=2){
      if(h+1<gridVertical.length){
        verticalDistance.push(Math.abs(getStringCord(gridVertical[h],"x")-getStringCord(gridVertical[h+1],"x")));
      }
      xVertex.push(getStringCord(gridVertical[h],"x"));
    }
    let boxes = [];
    let startingPoints = [[xVertex[0],yVertex[0]]];
    horizontalDistanceTest=parseInt(referenceBox.bottomLeft.y)-parseInt(referenceBox.topLeft.y);

    startingPoints.push([xVertex[0]+verticalDistance[0],yVertex[0]]);
    startingPoints.push([xVertex[0]+verticalDistance[0]*2,yVertex[0]]);
    startingPoints.push([xVertex[0],yVertex[0]+horizontalDistanceTest]);
    startingPoints.push([xVertex[0],yVertex[0]+horizontalDistanceTest*2]);
    startingPoints.push([xVertex[0]+verticalDistance[0],yVertex[0]+horizontalDistanceTest]);
    startingPoints.push([xVertex[0]+verticalDistance[0]*2,yVertex[0]+horizontalDistanceTest]);
    startingPoints.push([xVertex[0]+verticalDistance[0],yVertex[0]+horizontalDistanceTest*2]);
    startingPoints.push([xVertex[0]+verticalDistance[0]*2,yVertex[0]+horizontalDistanceTest*2]);

    let colorsBoxes=[];
    for(let i=0;i<startingPoints.length;i++){
      let o = {
        topLeft: {
          x:startingPoints[i][0],
          y:startingPoints[i][1]
        },
        bottomLeft: {
          x:startingPoints[i][0],
          y:startingPoints[i][1]+horizontalDistanceTest
        },
        topRight: {
          x:startingPoints[i][0]+verticalDistance[0],
          y:startingPoints[i][1]
        },
        bottomRight: {
          x:startingPoints[i][0]+verticalDistance[0],
          y:startingPoints[i][1]+horizontalDistanceTest
        },
        colors:{}
      };
      o.colors=getColorsCoordinates(imageData,o);
      boxes.push(o);
    }

    let scores={};

    for(let i=0;i<boxes.length;i++){
      boxes[i].score=0;
      for(let color in boxes[i].colors){
        let rgb = color.split(",");
        if(parseInt(rgb[0])<220 || parseInt(rgb[1])<220 || parseInt(rgb[2])<220){
          if(colorSample.hasOwnProperty(color)){
            if(colorSample[color]>50){
              boxes[i].score+=Math.abs(colorSample[color]-Math.abs(colorSample[color]-boxes[i].colors[color]));
            }
          }
        }
      }
      boxes[i].colors=null;
    }

    console.log(boxes);

    let maxBox=boxes[0];
    let maxScore=boxes[0].score;
    for(let i=1;i<boxes.length;i++){
      if(boxes[i].score>maxScore){
        maxScore=boxes[i].score;
        maxBox=boxes[i];
      }
    }
    for(let i=0;i<boxes.length;i++){
      getColorsCoordinates(imageData,boxes[i],[255,255,255]);
    }
    getColorsCoordinates(imageData,maxBox,[0,0,0]);

    return maxBox;

    /*let myFile = fs.createWriteStream("output.png");
    savePixels(imageData, "png").pipe(myFile);
    return 1;*/
  });
}

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
          const sql_insert = "INSERT INTO consumption SET ?";
          try{
            const result_insert = await query(sql_insert,{id_apikey,date});
            response = {"error":false,"result":result};
          } catch(e){
            console.log(e);
            response = {"error":true,"result":result};
          }
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
