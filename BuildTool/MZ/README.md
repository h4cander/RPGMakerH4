



# Example
```js
(async () => {
    const mzSrcFolder = path.join(__dirname, "MZBuildSample");
    const outFolder = path.join(__dirname, "dist", "MyGame_0_0_1");
    const mzPublishFolder = path.join(outFolder, "MyGame");

    //start
    const aBuildToolMZ = new BuildToolMZWin();

    console.log("downloading zip...");
    await aBuildToolMZ.downloadRPGMakerMZLiteAsync();

    console.log("extracting zip...");
    await aBuildToolMZ.extractZipAsync();

    await aBuildToolMZ.copyBaseFilesAsync(mzPublishFolder);
    await aBuildToolMZ.copySrcMzFilesAsync(mzSrcFolder, mzPublishFolder);
    await aBuildToolMZ.processPackageJsonAsync(mzSrcFolder, mzPublishFolder);
    await aBuildToolMZ.processSystemJsonAsync(mzSrcFolder, mzPublishFolder);
    await aBuildToolMZ.processAudiosAndImgsAsync(mzSrcFolder, mzPublishFolder);
    await aBuildToolMZ.copyFileToDestFolderAsync("/mydocs/README.md", outFolder);

    console.log(`${outFolder} is being compressed...`);
    await aBuildToolMZ.zipFolderAsync(outFolder);
})();
```