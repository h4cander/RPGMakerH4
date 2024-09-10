
const axios = require("axios");
const AdmZip = require("adm-zip");
const fs = require("fs-extra");
const path = require("path");




class MZEncrypter {
    constructor(encryptionKey) {
        this._encryptionKey = encryptionKey;
    }

    async readAsync(filePath) {
        const data = await fs.readFile(filePath);
        const arrayBuffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
        return arrayBuffer;
    }

    async writeAsync(filePath, arrayBuffer) {
        const dirPath = path.dirname(filePath);

        await fs.ensureDir(dirPath);

        const buffer = Buffer.from(arrayBuffer);
        await fs.writeFile(filePath, buffer);
    }

    /**
     * Encrypts plain
     * @param {ArrayBuffer} source - The plain data to be encrypted.
     * @returns {ArrayBuffer} The encrypted data.
     */
    encryptArrayBuffer(source) {
        const header = new Uint8Array([0x52, 0x50, 0x47, 0x4d, 0x56, 0x00, 0x00, 0x00, 0x00, 0x03, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00]);

        const body = new Uint8Array(source);
        const encryptedBuffer = new ArrayBuffer(header.length + body.length);
        const encryptedView = new Uint8Array(encryptedBuffer);

        encryptedView.set(header, 0);

        const key = this._encryptionKey.match(/.{2}/g);

        for (let i = 0; i < 16 && i < body.length; i++) {
            encryptedView[header.length + i] = body[i] ^ parseInt(key[i], 16);
        }

        if (body.length > 16) {
            encryptedView.set(body.slice(16), header.length + 16);
        }

        return encryptedBuffer;
    };

    async encrypFileAsync(srcFilePath, distFilePath) {
        const buffer = await this.readAsync(srcFilePath);
        const encryptbuffer = this.encryptArrayBuffer(buffer);
        await fs.ensureDir(path.dirname(distFilePath));
        await this.writeAsync(distFilePath, encryptbuffer);
    }
}


class BuildToolMZWin {

    static getBaseExcludes() {
        return [
            /css\//,
            /data\//,
            /icon\//,
            /img\//,
            /js\//,
            /package\.json$/,
            /index\.html$/
        ];
    }

    static getMZSrcExcludes() {
        return [
            /audio\//,
            /img\//,
            /save\//,
            /\.rmmzproject$/,
            /package\.json$/,
            /data\/System.json/
        ];
    }

    get _rpgMakerMZLiteUrl() {
        return "https://github.com/h4cander/RPGMakerH4/releases/download/RPGMakerMZLite_v1.8.0/RPGMakerMZLite.zip";
    }
    get _rpgMakerMZLiteFileName() {
        return this._rpgMakerMZLiteUrl.split("/").pop();
    }

    get workDir() {
        return this._workDir;
    }

    /**
     * @param {string} workDir - temp folder to process 
     * @param {*} encryptionKey
     */
    constructor(workDir = null, encryptionKey = null) {
        this._workDir = workDir ?? path.join(__dirname, "dist");
        this._encryptionKey = encryptionKey ?? this.getRandomSubstring("0123456789abcdefghijklmnopqrstuvwxyz", 32);
        this._mzEncrypter = new MZEncrypter(this._encryptionKey);
    }

    getRandomSubstring(s, l) {
        if (l > s.length) {
            throw new Error("The specified length is longer than the input string.");
        }

        let result = "";
        for (let i = 0; i < l; i++) {
            const randomIndex = Math.floor(Math.random() * s.length);
            result += s[randomIndex];
        }

        return result;
    }

    getLiteZipPath() {
        return path.join(this._workDir, this._rpgMakerMZLiteFileName);
    }
    getLiteFolder() {
        return path.join(this._workDir, this._rpgMakerMZLiteFileName).split(".")[0];
    }

    async downloadRPGMakerMZLiteAsync() {
        if (await fs.pathExists(this.getLiteZipPath())) return Promise.resolve();

        await fs.ensureDir(path.dirname(this.getLiteZipPath()));

        const writer = fs.createWriteStream(this.getLiteZipPath());

        const response = await axios({
            url: this._rpgMakerMZLiteUrl,
            method: "GET",
            responseType: "stream"
        });

        response.data.pipe(writer);

        return new Promise((resolve, reject) => {
            writer.on("finish", () => resolve()); // 回傳檔案路徑
            writer.on("error", reject);
        });
    }

    async extractZipAsync() {
        const zip = new AdmZip(this.getLiteZipPath());
        zip.extractAllTo(this.getLiteFolder(), true);
    }

    listAllFilePath(folder, currentPath = "") {
        const fullPath = path.join(folder, currentPath);
        let fileList = [];

        const files = fs.readdirSync(fullPath);
        files.forEach(file => {
            const filePath = path.join(currentPath, file);
            const absoluteFilePath = path.join(folder, filePath);
            const stat = fs.statSync(absoluteFilePath);

            if (stat.isDirectory()) {
                fileList = fileList.concat(this.listAllFilePath(folder, filePath));
            } else {
                fileList.push(filePath);
            }
        });

        return fileList;
    }

    async copyFileAsync(srcFilePath, destFilePath) {
        await fs.ensureDir(path.dirname(destFilePath));
        await fs.copy(srcFilePath, destFilePath);
        return destFilePath;
    }

    async copyFileToDestFolderAsync(srcFilePath, destFolder) {
        await fs.ensureDir(path.dirname(destFolder));
        const fileName = path.basename(srcFilePath);
        const destFilePath = path.join(destFolder, fileName);
        await fs.copy(srcFilePath, destFilePath);
        return destFilePath;
    }

    async _processFileAsync(srcFilePath, distFilePath, contentProcessor = null) {
        const content = await fs.readFile(srcFilePath, "utf8");
        const processedContent = contentProcessor(content);
        await fs.writeFile(distFilePath, processedContent, "utf8");
        return distFilePath;
    }

    async processPackageJsonAsync(srcFolder, distFolder) {
        const distFilePath = path.join(distFolder, "package.json");
        await this._processFileAsync(
            path.join(srcFolder, "package.json"),
            path.join(distFolder, "package.json"),
            content => {
                const data = JSON.parse(content);

                if (!data["chromium-args"].includes("--disable-devtools")) {
                    data["chromium-args"] += " --disable-devtools";
                }

                return JSON.stringify(data);
            }
        );
        console.log(`file processed: ${distFilePath}`);
    }

    async processSystemJsonAsync(srcFolder, distFolder) {
        const distFilePath = path.join(distFolder, "data", "System.json");
        await this._processFileAsync(
            path.join(srcFolder, "data", "System.json"),
            distFilePath,
            content => {
                const data = JSON.parse(content);
                data.hasEncryptedImages = true;
                data.hasEncryptedAudio = true;
                data.encryptionKey = this._encryptionKey;
                return JSON.stringify(data);
            }
        );
        console.log(`file processed: ${distFilePath}`);
    }

    async encrypterFolderAsync(srcFolder, destFolder) {
        const filePaths = this.listAllFilePath(srcFolder);
        for (let i = 0; i < filePaths.length; i++) {
            const outFilePath = path.join(destFolder, path.basename(srcFolder), `${filePaths[i]}_`);
            await this._mzEncrypter.encrypFileAsync(path.join(srcFolder, filePaths[i]), outFilePath);
            console.log(`encrypted: ${outFilePath}`);
        }
    }

    async processAudiosAndImgsAsync(srcFolder, distFolder) {
        await this.encrypterFolderAsync(path.join(srcFolder, "audio"), distFolder)
        await this.encrypterFolderAsync(path.join(srcFolder, "img"), distFolder)
    }

    async zipFolderAsync(folder) {
        const zip = new AdmZip();
        zip.addLocalFolder(folder);
        const filePath = `${folder}.zip`;
        zip.writeZip(`${folder}.zip`);
        console.log(`compressed: ${filePath}`)
    }

    async copyBaseFilesAsync(mzPublishFolder) {
        const baseOutFilePaths = this.listAllFilePath(this.getLiteFolder())
            .filter(p => !BuildToolMZWin.getBaseExcludes().some(e => e.test(p)));

        for (let i = 0; i < baseOutFilePaths.length; i++) {
            const outFilePath = path.join(mzPublishFolder, baseOutFilePaths[i]);
            await this.copyFileAsync(
                path.join(this.getLiteFolder(), baseOutFilePaths[i]),
                outFilePath);

            console.log(`base mz file copied: ${outFilePath}`);
        }
    }

    async copySrcMzFilesAsync(mzSrcFolder, mzPublishFolder, excludes = []) {
        const srcMZFiles = this.listAllFilePath(mzSrcFolder)
            .filter(p => !BuildToolMZWin.getMZSrcExcludes().some(e => e.test(p)))
            .filter(p => !excludes.some(e => e.test(p)));
        for (let i = 0; i < srcMZFiles.length; i++) {
            const outFilePath = path.join(mzPublishFolder, srcMZFiles[i]);
            await this.copyFileAsync(
                path.join(mzSrcFolder, srcMZFiles[i]),
                outFilePath);

            console.log(`src mz file copied: ${outFilePath}`);
        }
    }
}


module.exports = { MZEncrypter, BuildToolMZWin };
