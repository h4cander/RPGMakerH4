
# Install
```
npm i rpgmakerh4-buildtool-mz
```


# Example
```js

const { BuildToolMZWin } = require("rpgmakerh4-buildtool-mz");
const path = require("path");

(async () => {
    const mzSrcFolder = path.join(__dirname, "MZBuildSample"); //your mz folder path to publish
    const outFolder = path.join(__dirname, "dist", "MyGame_0_0_2");
    const mzPublishFolder = path.join(outFolder, "MyGame");

    //start
    const aBuildToolMZ = new BuildToolMZWin();
    //const aBuildToolMZ = new BuildToolMZWin(null, null, null);
    //const aBuildToolMZ = new BuildToolMZWin(null, "00000000000000000000000000000000", null); 00000000000000000000000000000000 is your encryptionKey

    console.log("downloading zip...");
    await aBuildToolMZ.downloadRPGMakerMZLiteAsync();

    console.log("extracting zip...");
    await aBuildToolMZ.extractZipAsync();

    await aBuildToolMZ.copyBaseFilesAsync(mzPublishFolder);
    await aBuildToolMZ.copySrcMzFilesAsync(mzSrcFolder, mzPublishFolder, [
        /\.js\.map$/
    ]);
    await aBuildToolMZ.processPackageJsonAsync(mzSrcFolder, mzPublishFolder);
    await aBuildToolMZ.processSystemJsonAsync(mzSrcFolder, mzPublishFolder);
    await aBuildToolMZ.processAudiosAndImgsAsync(mzSrcFolder, mzPublishFolder);

    //other file you want. like credits.txt, readme.txt
    await aBuildToolMZ.copyFileToDestFolderAsync(path.join(__dirname, "docs", "README.md"), outFolder);

    console.log(`${outFolder} is being compressed...`);
    await aBuildToolMZ.zipFolderAsync(outFolder);
})();

```