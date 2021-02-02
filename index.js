const express = require("express");
const app = express();
const port = process.env.port || 8080;
const fetch = require("node-fetch");
var rawData = [];
require("dotenv").config();
app.listen(port, () => {
  console.log(`App is running on port ${port}`);
});

app.get("/detail", function (req, res) {
  DoWork(req, res);
});

async function DoWork(req, res) {
  var type = req.query.type;
  var url = req.query.url;
  if (type == null || url == null)
    res.json({ status: "Error", code: "Please provide type and url params" });
  else {
    try {
      var firstUrl = await getPathName(url);
      var contentData = await getIdandDetail(
        process.env.FIRST_URL + "?url=" + firstUrl
      );
      var streamdata = await getAllData(
        process.env.SECOND_URL + `?type=${type}&id=${contentData.data.id}`
      );
      if (type.includes("episode"))
        await SendSeriesData(contentData, streamdata, res);
      else await SendMovieData(contentData, streamdata, res);
    } catch (e) {
      res.json({ status: "Error", code: "Wrong url or type. Please check this again..." });
    }
  }
}

async function getIdandDetail(url) {
  rawData = await fetch(url);
  rawData = await rawData.json();
  return rawData;
}
async function getAllData(url) {
  rawData = [];
  rawData = await fetch(url);
  rawData = await rawData.json();
  return rawData;
}
async function getPathName(url) {
  return new URL(url).pathname;
}

async function SendSeriesData(contentData, streamdata, res) {
  var actors = await ProcessActors(streamdata.contributors);
  var response = {
    id: contentData.data.id,
    type: "series",
    seriesTitle: contentData.data.display_title,
    description: contentData.data.description,
    releaseDate: streamdata.releaseDate,
    season_no: contentData.data.dependencies.season.season_no,
    episode_no: contentData.data.source.episode_no,
    duration: contentData.data.source.duration + " seconds",
    actors: actors,
    images: streamdata.imageInfo,
    m3u8_url: "https://llvod.mxplay.com/" + streamdata.stream.hls.high,
  };
  if (response.m3u8_url != null) res.send(response);
  else
    res.json({
      status: "error",
      code: "Unable to process this url. Please check url and its type.",
    });
}
async function SendMovieData(contentData, streamdata, res) {
  var actors = await ProcessActors(streamdata.contributors);
  var img = await ProcessImages(streamdata.imageInfo);
  var response = {
    id: contentData.data.id,
    type: "movies",
    title: contentData.data.title,
    description: contentData.data.description,
    releaseDate: streamdata.releaseDate,
    duration: contentData.data.source.duration + " seconds",
    actors: actors,
    images: img,
    m3u8_url: "https://llvod.mxplay.com/" + streamdata.stream.hls.high,
  };
  if (response.m3u8_url != null) res.send(response);
  else
    res.json({
      status: "error",
      code: "Unable to process this url. Please check url and its type.",
    });
}

async function ProcessActors(actors) {
  var wholeData = [];
  await actors.forEach((element) => {
    var data = {
      name: element.name,
      type: element.type,
    };
    wholeData.push(data);
  });
  return wholeData;
}

async function ProcessImages(images) {
  var wholeData = [];
  await images.forEach((element) => {
    var data = {
      type: element.type,
      url: "https://isa-1.mxplay.com/" + element.url,
    };
    wholeData.push(data);
  });
  return wholeData;
}
