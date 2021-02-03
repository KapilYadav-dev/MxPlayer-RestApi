const express = require("express");
const app = express();
const port = process.env.PORT || 8080;
const fetch = require("node-fetch");
var path = require('path')
var rawData = [];

app.listen(port, () => {
  console.log(`App is running on port ${port}`);
});
app.get("/", function (req, res) {
  res.sendFile(path.join(__dirname + '/index.html'));
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
        'https://seo.mxplay.com/v1/api/seo/get-url-details' + "?url=" + firstUrl
      );
      var streamdata = await getAllData(
        'https://api.mxplay.com/v1/web/detail/video' + `?type=${type}&id=${contentData.data.id}`
      );
      if (type.includes("episode"))
        await SendSeriesData(contentData, streamdata, res);
      else await SendMovieData(contentData, streamdata, res);
    } catch (e) {
      console.log(e)
      res.json({
        status: "Error",
        code: "Wrong url or type. Please check this again...",
        error:e
      });
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
  var img = await ProcessImages(streamdata.imageInfo);
  var mediaUrl =
  streamdata.stream.hls.high ||
  streamdata.stream.hls.base ||
  streamdata.stream.hls.min;
  var response = {
    id: contentData.data.id,
    type: "series",
    seriesTitle: contentData.data.display_title,
    description: contentData.data.description,
    releaseDate: streamdata.releaseDate,
    season_no: contentData.data.dependencies.season.season_no,
    episode_no: contentData.data.source.episode_no,
    duration: contentData.data.source.duration,
    actors: actors,
    images: img,
    streamingUrl: "https://llvod.mxplay.com/" + mediaUrl,
  };
  if (mediaUrl != null) res.send(response);
  else
    res.json({
      status: "error",
      code: "Unable to process this url. Please check url and its type.",
    });
}
async function SendMovieData(contentData, streamdata, res) {
  var actors = await ProcessActors(streamdata.contributors);
  var img = await ProcessImages(streamdata.imageInfo);
  var mediaUrl =
    streamdata.stream.hls.high ||
    streamdata.stream.hls.base ||
    streamdata.stream.hls.min;
  var response = {
    id: contentData.data.id,
    type: "movies",
    title: contentData.data.title,
    description: contentData.data.description,
    releaseDate: streamdata.releaseDate,
    duration: contentData.data.source.duration + " seconds",
    actors: actors,
    images: img,
    streamingUrl: "https://llvod.mxplay.com/" + mediaUrl,
  };
  if (mediaUrl != null) res.send(response);
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
