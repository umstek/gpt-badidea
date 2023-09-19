import { Browser, BrowserContext, chromium, Page } from "playwright";
import config from "./config.js";

export class BrowserInterface {
  browser!: Browser;
  context!: BrowserContext;
  page!: Page;

  private constructor() {}

  private async init() {
    this.browser = await chromium.launch({ headless: config.BROWSER_HEADLESS });
    this.context = await this.browser.newContext();
    this.page = await this.context.newPage();
  }

  async navigate(url: string) {
    await this.page.goto(url);
  }

  async click(selector: string) {
    await this.page.click(selector);
  }

  async type(selector: string, text: string) {
    await this.page.fill(selector, text);
  }

  async evaluate(expression: string) {
    return await this.page.evaluate(expression);
  }

  async close() {
    await this.browser.close();
  }

  static async createInstance() {
    const instance = new BrowserInterface();
    await instance.init();
    return instance;
  }
}

export const browserInterface = config.BROWSER
  ? await BrowserInterface.createInstance()
  : undefined;
