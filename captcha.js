const fs = require("fs");
const getPixels = require("get-pixels");
const zeros = require("zeros");
const savePixels = require("save-pixels");

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

async function readCaptcha(path){
  return await getPixels(path, async function(err, pixels) {
    if(err) {
      console.log("Bad image path");
      return -1;
    }
    const imageData = pixels;
    const imageDataLength = imageData.data.length;

    let gridVertical = [];
    let gridHorizontal = [];

    let x = -1;
    let y = -1;
    for(x=0;x<imageData.shape[0];x++){
      let verticalWhite = false,
          verticalWhiteX = -1;
      for(y=0;y<imageData.shape[1];y++){
        let i = x*4 + y*imageData.shape[0]*4;
        if( isColor([255,255,255],[imageData.data[i],imageData.data[i+1],imageData.data[i+2]],5) ){
          verticalWhite=true;
          verticalWhiteX=x;
          break;
        }
      }
      if(verticalWhite===false){
        gridVertical.push(x);
        cleanRow(imageData,x);
      }
    }
    console.log(gridVertical);

    for(y=0;y<imageData.shape[1];y++){
      let verticalWhite = false,
          verticalWhiteX = -1;
      for(x=0;x<imageData.shape[0];x++){
        let i = x*4 + y*imageData.shape[0]*4;
        if( isColor([255,255,255],[imageData.data[i],imageData.data[i+1],imageData.data[i+2]],5) ){
          verticalWhite=true;
          verticalWhiteX=x;
          break;
        }
      }
      if(verticalWhite===false){
        gridHorizontal.push(y);
        cleanLine(imageData,y);
      }
    }

    for(let gh=0;gh<gridHorizontal.length;gh++){
        console.log(gridHorizontal[gh]);
    }

    for(x=0;x<imageData.shape[1];x++){
      let notColoredY = [],
          count = 0;
      for(y=0;y<imageData.shape[0];y++){
        let i = x*4 + y*imageData.shape[0]*4;
        if( isColor([0,0,0,0],[imageData.data[i],imageData.data[i+1],imageData.data[i+2],imageData.data[i+3]]) ){
          if(count<10){
            for(let yy=0;yy<notColoredY.length;yy++){
              cleanLine(imageData,notColoredY[yy]);
            }
          }
          notColoredY = [],
          count = 0;
        } else {
          notColoredY.push(y);
          count++;
        }
      }
    }

    const whiteCords = {};
    for(y=0;y<imageData.shape[1];y++){
      for(x=0;x<imageData.shape[0];x++){
        let i = x*4 + y*imageData.shape[0]*4;
        if( isColor([255,255,255],[imageData.data[i],imageData.data[i+1],imageData.data[i+2]],5) ){
          if(!whiteCords.hasOwnProperty(y)){
            whiteCords[y]={
              min:x,
              max:x
            }
          } else {
            whiteCords[y].max=x;
          }
        }
      }
    }
  //  console.log(whiteCords);
    for(y=0;y<imageData.shape[1];y++){
      for(x=0;x<imageData.shape[0];x++){
        let i = x*4 + y*imageData.shape[0]*4;
        if(imageData.data[i+3] !== 0 && !insideCords(whiteCords,x,y)){
          cleanCord(imageData,x,y);
        }
      }
    }

    let myFile = fs.createWriteStream("output.png");
    savePixels(imageData, "png").pipe(myFile);
    return 1;
  });
}

async function start(){
  const result = await readCaptcha(__dirname+"/captcha2.png");
}


start();
