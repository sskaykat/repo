// ==MiruExtension==
// @name         NyaFun动漫
// @version      v0.0.6
// @author       hualiong
// @lang         zh-cn
// @license      MIT
// @icon         https://s1.imagehub.cc/images/2024/07/18/4cd2cce8076bb8ffeb7c8f8b34c02a31.png
// @package      nyadm.link
// @type         bangumi
// @webSite      https://www.nyadm.net
// @nsfw         false
// ==/MiruExtension==
export default class extends Extension {
  decrypt = {
    filter: () => {
      const time = Math.ceil(new Date().getTime() / 1000);
      return { time, key: CryptoJS.MD5("DS" + time + "DCC147D11943AF75").toString() }; // EC.Pop.Uid: DCC147D11943AF75
    },
    player: (src, key) => {
      let ut = CryptoJS.enc.Utf8.parse("2890" + key + "tB959C"),
        mm = CryptoJS.enc.Utf8.parse("2F131BE91247866E"),
        decrypted = CryptoJS.AES.decrypt(src, ut, {
          iv: mm,
          mode: CryptoJS.mode.CBC,
          padding: CryptoJS.pad.Pkcs7,
        });
      return CryptoJS.enc.Utf8.stringify(decrypted);
    },
  };

  text(element) {
    const str = [...element.content.matchAll(/>([^<]+?)</g)]
      .map((m) => m[1])
      .join("")
      .trim();
    return this.textParser(str);
  }

  textParser(str) {
    const dict = new Map([
      ["&nbsp;", " "],
      ["&quot;", '"'],
      ["&lt;", "<"],
      ["&gt;", ">"],
      ["&amp;", "&"],
      ["&sdot;", "·"],
    ]);
    return str.replace(/&[a-z]+;/g, (c) => dict.get(c) || c);
  }

  base64decode(str) {
    let words = CryptoJS.enc.Base64.parse(str);
    return CryptoJS.enc.Utf8.stringify(words);
  }

  async querySelector(content, selector) {
    const res = await this.querySelectorAll(content, selector);
    return res === null ? null : res[0];
  }

  async $req(url, options = { headers: {} }, count = 3, timeout = 5000) {
    try {
      if (!options.headers["Miru-Url"]) options.headers["Miru-Url"] = this.domain;
      return await Promise.race([
        this.request(url, options),
        new Promise((_, reject) => {
          setTimeout(() => {
            reject(new Error("Request timed out!"));
          }, timeout);
        }),
      ]);
    } catch (error) {
      if (count > 0) {
        console.log(`[Retry (${count})]: ${url}`);
        return this.$req(url, options, count - 1, timeout + 1000);
      } else {
        throw error;
      }
    }
  }

  async select(page, filter) {
    const { time, key } = this.decrypt.filter();
    const res = await this.$req("/index.php/api/vod", {
      method: "post",
      data: { type: filter.channels[0], class: filter.genres[0], year: filter.years[0], page, time, key },
    });
    return res.list.map((e) => ({
      title: e.vod_name,
      url: `/bangumi/${e.vod_id}.html|${e.vod_name}|${e.vod_pic}`,
      cover: e.vod_pic,
      update: e.vod_remarks,
    }));
  }

  async test() {
    try {
      await this.request("/play/7566-1-1.html", { headers: { "Miru-Url": this.domain } });
      this.verify = false;
    } catch (error) {
      this.verify = true;
    }
    return this.verify;
  }

  // =============================== 分割线 ============================== //

  async load() {
    const res = await this.$req("/", { headers: { "Miru-Url": "https://www.nyadm.link" } });
    this.domain = await this.getAttributeText(res, "div.links > a:nth-child(1)", "href");
    console.log(this.domain);
    console.log(await this.test())
  }

  async createFilter() {
    const channels = {
      title: "频道",
      max: 1,
      min: 0,
      default: "",
      options: {
        1: "番剧",
        2: "剧场",
      },
    };
    const genres = {
      title: "类型（分类动漫不代表全部动漫）",
      max: 1,
      min: 0,
      default: "",
      options: {
        奇幻: "奇幻",
        战斗: "战斗",
        冒险: "冒险",
        热血: "热血",
        日常: "日常",
        搞笑: "搞笑",
        后宫: "后宫",
        异世界: "异世界",
        穿越: "穿越",
        治愈: "治愈",
        爱情: "爱情",
        狗粮: "狗粮",
        小说改: "小说改",
        漫画改: "漫画改",
        游戏改: "游戏改",
        偶像: "偶像",
        校园: "校园",
        催泪: "催泪",
        青春: "青春",
        恋爱: "恋爱",
        机战: "机战",
        科幻: "科幻",
        百合: "百合",
        音乐: "音乐",
        悬疑: "悬疑",
        恐怖: "恐怖",
        运动: "运动",
        性转: "性转",
        党争: "党争",
      },
    };
    const years = {
      title: "年份",
      max: 1,
      min: 0,
      default: "",
      options: Object.fromEntries(
        new Map(
          Array.from({ length: new Date().getFullYear() - 1999 }, (_, i) => [
            (2000 + i).toString(),
            (2000 + i).toString(),
          ])
        )
      ),
    };
    return { channels, genres, years };
  }

  async latest(page) {
    if (this.verify && await this.test()) {
      return [{ title: "需要验证才能使用该扩展！", url: "/play/7566-1-1.html", cover: null }];
    }
    const res = await this.$req(`/index.php/ajax/data.html?mid=1&limit=20&page=${page}`);
    return res.list.map((e) => ({
      title: e.vod_name,
      url: `${e.detail_link}|${e.vod_name}|${e.vod_pic}`,
      cover: e.vod_pic,
      update: e.vod_remarks,
    }));
  }

  async search(kw, page, filter) {
    if (this.verify && await this.test()) {
      return [{ title: "需要验证才能使用该扩展！", url: "/play/7566-1-1.html", cover: null }];
    }
    if (filter?.channels?.[0] || filter?.genres?.[0] || filter?.years?.[0]) {
      if (kw) throw new Error("在使用筛选器时无法同时使用搜索功能！");
      return this.select(page, filter);
    } else if (!kw) return this.latest(page);
    const res = await this.$req(`/search/wd/${encodeURI(kw)}/page/${page}.html`);
    const list = await this.querySelectorAll(res, "div.search-box");
    if (list === null) {
      return [];
    }
    const videos = list.map(async (e) => {
      const label = await this.querySelector(e.content, ".public-list-exp");
      const title = this.text(await this.querySelector(e.content, ".right .thumb-txt"));
      const cover = await this.getAttributeText(label.content, "img.gen-movie-img", "data-src");
      const update = this.text(await this.querySelector(label.content, "span.public-list-prb"));
      const url = `${await label.getAttributeText("href")}|${title}|${cover}`;
      return { title, url, cover, update };
    });
    return await Promise.all(videos);
  }

  async detail(str) {
    if (this.verify) {
      return {
        title: "请点击右上角的 Webview 窗口进入网站通过验证",
        cover: null,
        desc: "请点击右上角的 Webview 窗口进入网站通过验证",
      };
    }
    const data = str.split("|");
    const res = await this.$req(data[0]);
    const desc = this.textParser(res.match(/\bid="height_limit".*?>([\s\S]*?)</)[1]);
    const labelTask = this.querySelectorAll(res, ".anthology-tab a");
    const sources = await this.querySelectorAll(res, ".anthology-list-play");
    const labels = (await labelTask).map((e) => this.textParser(e.content.match(/i>(.*?)</)[1]));
    let reg = /href="(.*?)">(.*?)</;
    const episodes = sources.map(async (source, i) => {
      const urls = (await this.querySelectorAll(source.content, "a")).map((a) => {
        const match = reg.exec(a.content);
        return { name: match[2], url: match[1] };
      });
      return { title: labels[i], urls };
    });
    return { title: data[1], cover: data[2], desc, episodes: await Promise.all(episodes) };
  }

  async watch(url) {
    let res = null;
    try {
      res = await this.$req(url);
    } catch (error) {
      this.verify = true
      throw new Error("若网络没问题，则可能是网站需要验证，请重启应用再试");
    }
    const player = JSON.parse(res.match(/var player_aaaa=({.+?})</)[1]);
    const raw = decodeURIComponent(player.encrypt == 2 ? this.base64decode(player.url) : player.url);
    const resp = await this.$req(`/player/ec.php?code=qw&url=${raw}`, {
      headers: { "Miru-Url": this.domain.replace("www", "play"), Referer: this.domain },
    });
    const json = JSON.parse(resp.match(/let ConFig = ({.+})/)[1]);
    const link = this.decrypt.player(json.url, json.config.uid);
    console.log(link);
    return { type: link.indexOf(".mp4") > 0 ? "mp4" : "hls", url: link };
  }
}
