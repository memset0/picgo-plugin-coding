const postOptions = (realUrl, lastCommit, token, fileName, image) => {
  const formData = {
    message: `upload ${fileName}`,
    lastCommitSha: lastCommit,
    newRef: '',
    uploadFile: {
      value: image,
      options: {
        filename: fileName
      }
    }

  };
  return {
    method: 'POST',
    url: realUrl,
    headers: {
      contentType: 'multipart/form-data',
      'User-Agent': 'PicGo',
      Authorization: `token ${token}`
    },
    formData: formData

  };
};

module.exports = (ctx) => {
  const register = () => {
    ctx.helper.uploader.register('coding', {
      handle,
      name: 'Coding图床',
      config: config
    });
  };

  const handle = async function (ctx) {
    const userConfig = ctx.getConfig('picBed.coding');
    if (!userConfig) {
      throw new Error("Can't find uploader config");
    }

    const groupName = userConfig.groupName;
    const project = userConfig.Project;
    const token = userConfig.Token;
    const branch = userConfig.branch || 'master';
    const floder = userConfig.floder || '';
    const saveWithDate = userConfig.save_with_date;
    let basicUrl = userConfig.customUrl || `https://${groupName}.coding.net/p/${project}/d/${project}/git/raw/${branch}`;
    if (basicUrl[basicUrl.length - 1] === '/') {
      basicUrl = basicUrl.substr(0, basicUrl.length - 2);
    }
    let suffixUrl = '';
    const preUrl = `https://${groupName}.coding.net/api/user/${groupName}/project/${project}/depot/${project}/git/upload/${branch}`;
    if (floder) {
      if (saveWithDate) {
        const date = new Date();
        suffixUrl = `${floder}/${date .getFullYear()}/${date .getMonth() + 1}/${date .getDate()}`;
      } else {
        suffixUrl = `${floder}`;
      }
    } else {
      if (saveWithDate) {
        const date = new Date();
        suffixUrl = `${date .getFullYear()}/${date .getMonth() + 1}/${date .getDate()}`;
      }
    }
    let realUrl = '';
    if (suffixUrl.length !== 0) {
       realUrl = `${preUrl}/${suffixUrl}`;
    } else {
       realUrl = `${preUrl}`;
    }
    try {
      const imgList = ctx.output;
      for (const i in imgList) {
        let lastCommit = '';
        // eslint-disable-next-line no-await-in-loop
        const rep = await ctx.Request.request({
          method: 'GET',
          url: realUrl,
          headers: {
            Authorization: `token ${token}`
          }
        });
        lastCommit = JSON.parse(rep).data.lastCommit;
        let image = imgList[i].buffer;
        if (!image && imgList[i].base64Image) {
          image = Buffer.from(imgList[i].base64Image, 'base64');
        }

        const fileName = imgList[i].fileName.replace(/\s/g, '');
        const postConfig = postOptions(
          realUrl,
          lastCommit,
          token,
          fileName,
          image
        );
        // eslint-disable-next-line no-await-in-loop
        const data = await ctx.Request.request(postConfig);
        ctx.log.info(JSON.parse(data));
        delete imgList[i].buffer;
        // imgList[i].imgUrl = `https://${groupName}.coding.net/p/${project}/d/${project}/git/raw/${branch}/${fileName}`;
        if (JSON.parse(data).code === 0) {
          if (suffixUrl.length === 0) {
            imgList[i].imgUrl = `${basicUrl}/${fileName}`;
          } else {
            imgList[i].imgUrl = `${basicUrl}/${suffixUrl}/${fileName}`;
          }

        }
      }
    } catch (err) {
      ctx.emit('notification', {
        title: '上传失败',
        body: JSON.stringify(err)
      });
    }
  };

  const config = (ctx) => {
    let userConfig = ctx.getConfig('picBed.coding');
    if (!userConfig) {
      userConfig = {};
    }
    return [
      {
        name: 'groupName',
        type: 'input',
        default: userConfig.groupName,
        required: true,
        message: 'groupName',
        alias: '团队名称'
      },
      {
        name: 'Project',
        type: 'input',
        default: userConfig.Project,
        required: true,
        message: 'Project',
        alias: '项目名称'
      },
      {
        name: 'Token',
        type: 'input',
        default: userConfig.Token,
        required: true,
        message: 'Token',
        alias: 'Token'
      },
      {
        name: 'branch',
        type: 'input',
        default: userConfig.branch,
        required: true,
        message: 'master',
        alias: '分支'
      },
      {
        name: 'floder',
        type: 'input',
        default: userConfig.floder,
        required: false,
        message: '',
        alias: '存储文件夹'
      },
      {
        name: 'save_with_date',
        type: 'confirm',
        required: false,
        default: userConfig.saveWithDate,
        alias: '按年月日存放'
      },
      {
        name: 'customUrl',
        type: 'input',
        required: false,
        default: userConfig.input,
        alias: '自定义域名'
      }
    ];
  };
  return {
    uploader: 'coding',
    register
  };
};
