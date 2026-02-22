import { invoke } from "@tauri-apps/api/core";
import "./styles.css";

// 响应类型定义
interface HandleRequestResponse {
  result?: unknown;
  error?: string;
}

interface QRCodeOptions {
  text: string;
  width: number;
  height: number;
  colorDark: string;
  colorLight: string;
  correctLevel: number;
}

interface QRCodeInstance {
  clear: () => void;
  makeCode: (value: string) => void;
}

interface QRCodeConstructor {
  new (element: HTMLElement, options: QRCodeOptions): QRCodeInstance;
  CorrectLevel: { H: number };
}

declare const QRCode: QRCodeConstructor;

type IntervalHandle = ReturnType<typeof window.setInterval> | null;

interface FormRefs {
  userId: HTMLInputElement;
  siteId: HTMLInputElement;
  classLessonId: HTMLInputElement;
  generateBtn: HTMLButtonElement;
  clearBtn: HTMLButtonElement;
  qrcode: HTMLElement;
  qrText: HTMLElement;
  updateTime: HTMLElement;
  autoUpdate: HTMLInputElement;
  parseInput: HTMLInputElement;
  parseBtn: HTMLButtonElement;
}

interface ModalRefs {
  overlay: HTMLElement;
  body: HTMLElement;
  closeButton: HTMLElement;
  declarationTemplate: HTMLTemplateElement;
  licenseTemplate: HTMLTemplateElement;
  declarationLink: HTMLAnchorElement;
  licenseLink: HTMLAnchorElement;
}

interface AppState {
  timer: IntervalHandle;
  modalAbortController: AbortController | null;
}

interface FormValues {
  userId: string;
  siteId: string;
  classLessonId: string;
}

interface ParsedQrText {
  id: string;
  siteId: string;
  classLessonId: string;
}

// 配置常量
const CONFIG = {
  AUTO_UPDATE_INTERVAL: 5000,
  QR_CODE_WIDTH: 256,
  QR_CODE_HEIGHT: 256,
} as const;

// Toast 通知容器
function createToastContainer(): HTMLElement {
  const container = document.createElement("div");
  container.id = "toast-container";
  container.className = "toast-container";
  document.body.appendChild(container);
  return container;
}

function showToast(message: string, type: "error" | "success" | "info" = "info"): void {
  const container = document.getElementById("toast-container") || createToastContainer();
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.textContent = message;

  container.appendChild(toast);

  // 动画显示
  requestAnimationFrame(() => {
    toast.classList.add("toast-show");
  });

  // 3秒后自动移除
  setTimeout(() => {
    toast.classList.remove("toast-show");
    toast.classList.add("toast-hide");
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

const STORAGE_KEYS = {
  userId: "qr_userId",
  siteId: "qr_siteId",
  classLessonId: "qr_classLessonId",
} as const;

document.addEventListener("DOMContentLoaded", () => {
  try {
    const refs = queryFormRefs();
    const modalRefs = queryModalRefs();
    const state: AppState = { timer: null, modalAbortController: null };

    const savedValues = restoreSavedValues(refs);
    registerFormHandlers(refs, state);
    registerModalHandlers(modalRefs, state);

    if (savedValues) {
      void generateQrCode(refs, state, savedValues);
    }
  } catch (error) {
    console.error("初始化失败:", error);
  }
});

function queryFormRefs(): FormRefs {
  return {
    userId: mustGet<HTMLInputElement>("userId"),
    siteId: mustGet<HTMLInputElement>("siteId"),
    classLessonId: mustGet<HTMLInputElement>("classLessonId"),
    generateBtn: mustGet<HTMLButtonElement>("generateBtn"),
    clearBtn: mustGet<HTMLButtonElement>("clearBtn"),
    qrcode: mustGet<HTMLElement>("qrcode"),
    qrText: mustGet<HTMLElement>("qrText"),
    updateTime: mustGet<HTMLElement>("updateTime"),
    autoUpdate: mustGet<HTMLInputElement>("autoUpdate"),
    parseInput: mustGet<HTMLInputElement>("parseQrTextInput"),
    parseBtn: mustGet<HTMLButtonElement>("parseQrTextBtn"),
  };
}

function queryModalRefs(): ModalRefs {
  return {
    overlay: mustGet<HTMLElement>("modalOverlay"),
    body: mustGet<HTMLElement>("modalBody"),
    closeButton: mustQuery<HTMLElement>(".close-button"),
    declarationTemplate: mustGet<HTMLTemplateElement>("declarationContent"),
    licenseTemplate: mustGet<HTMLTemplateElement>("licenseContent"),
    declarationLink: mustGet<HTMLAnchorElement>("showDeclaration"),
    licenseLink: mustGet<HTMLAnchorElement>("showLicense"),
  };
}

function registerFormHandlers(refs: FormRefs, state: AppState): void {
  refs.generateBtn.addEventListener("click", (event) => {
    event.preventDefault();
    const values = collectFormValues(refs);
    if (!values) {
      showToast("请填写所有必填字段", "error");
      return;
    }
    void generateQrCode(refs, state, values);
  });

  refs.clearBtn.addEventListener("click", (event) => {
    event.preventDefault();
    clearForm(refs, state);
  });

  refs.autoUpdate.addEventListener("change", () => {
    syncAutoUpdate(refs, state);
  });

  [refs.userId, refs.siteId, refs.classLessonId].forEach((input) => {
    input.addEventListener("input", () => persistFormValues(refs));
  });

  refs.parseBtn.addEventListener("click", (event) => {
    event.preventDefault();
    handleQrTextParsing(refs, state);
  });
}

function registerModalHandlers(refs: ModalRefs, state: AppState): void {
  // 清理旧的监听器
  if (state.modalAbortController) {
    state.modalAbortController.abort();
  }

  const abortController = new AbortController();
  state.modalAbortController = abortController;
  const { signal } = abortController;

  refs.declarationLink.addEventListener("click", (event) => {
    event.preventDefault();
    openModal(refs, refs.declarationTemplate);
  }, { signal });

  refs.licenseLink.addEventListener("click", (event) => {
    event.preventDefault();
    openModal(refs, refs.licenseTemplate);
  }, { signal });

  refs.closeButton.addEventListener("click", () => closeModal(refs), { signal });

  refs.overlay.addEventListener("click", (event) => {
    if (event.target === refs.overlay) {
      closeModal(refs);
    }
  }, { signal });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && isModalOpen(refs)) {
      closeModal(refs);
    }
  }, { signal });
}

function restoreSavedValues(refs: FormRefs): FormValues | null {
  const userId = localStorage.getItem(STORAGE_KEYS.userId) ?? "";
  const siteId = localStorage.getItem(STORAGE_KEYS.siteId) ?? "";
  const classLessonId = localStorage.getItem(STORAGE_KEYS.classLessonId) ?? "";

  refs.userId.value = userId;
  refs.siteId.value = siteId;
  refs.classLessonId.value = classLessonId;

  if (userId && siteId && classLessonId) {
    return { userId, siteId, classLessonId };
  }

  return null;
}

async function generateQrCode(refs: FormRefs, state: AppState, values: FormValues): Promise<void> {
  try {
    const qrText = await buildQrTextWithYaml(values);
    refs.qrText.textContent = qrText;
    refs.updateTime.textContent = `最后更新: ${new Date().toLocaleString()}`;
    renderQrCode(refs.qrcode, qrText);
    persistFormValues(refs);
    syncAutoUpdate(refs, state);
  } catch (error) {
    console.error("生成二维码出错:", error);
    const message = error instanceof Error ? error.message : "未知错误";
    refs.qrcode.innerHTML = `<p style="color:red;text-align:center;">生成二维码失败：${message}</p>`;
  }
}

/// 使用 YAML 数据格式构建 QR 码（新的数据流转方式）
/// Frontend (TS) → handle_request (YAML) → Rhai Engine → Rust Core
async function buildQrTextWithYaml(values: FormValues): Promise<string> {
  try {
    // 构建 YAML 格式的数据
    const yamlData = {
      id: values.userId,
      site_id: values.siteId,
      class_lesson_id: values.classLessonId,
    };

    // 使用 handle_request 命令，指定脚本名称
    const response = await invoke<HandleRequestResponse>("handle_request", {
      input: {
        script: "process_qr",
        data: yamlData,
      },
    });

    if (response.error) {
      throw new Error(response.error);
    }

    if (response.result && typeof response.result === "object") {
      const result = response.result as Record<string, unknown>;
      if (typeof result.qr_data === "string") {
        return result.qr_data;
      }
    }

    throw new Error("无效的响应格式");
  } catch (error) {
    const reason = error instanceof Error ? error.message : JSON.stringify(error);
    console.error("调用后端(YAML模式)失败:", error);
    throw new Error(`无法调用后端，请确认已通过桌面应用运行。原因: ${reason}`);
  }
}

function renderQrCode(container: HTMLElement, text: string): void {
  container.innerHTML = "";
  new QRCode(container, {
    text,
    width: CONFIG.QR_CODE_WIDTH,
    height: CONFIG.QR_CODE_HEIGHT,
    colorDark: "#000000",
    colorLight: "#ffffff",
    correctLevel: QRCode.CorrectLevel.H,
  });
}

function handleQrTextParsing(refs: FormRefs, state: AppState): void {
  const rawText = refs.parseInput.value.trim();
  if (!rawText) {
    showToast("请输入签到码文本", "error");
    return;
  }

  const parsed = parseQrText(rawText);
  if (!parsed) {
    showToast("签到码格式不正确，无法解析。", "error");
    return;
  }

  refs.userId.value = parsed.id;
  refs.siteId.value = parsed.siteId;
  refs.classLessonId.value = parsed.classLessonId;
  persistFormValues(refs);
  const nextValues: FormValues = {
    userId: parsed.id,
    siteId: parsed.siteId,
    classLessonId: parsed.classLessonId,
  };
  void generateQrCode(refs, state, nextValues);
}

function parseQrText(value: string): ParsedQrText | null {
  const prefix = "checkwork|";
  if (!value.startsWith(prefix)) {
    return null;
  }

  const query = value.slice(prefix.length);
  const params = new URLSearchParams(query);
  const id = params.get("id");
  const siteId = params.get("siteId");
  const classLessonId = params.get("classLessonId");

  if (!id || !siteId || !classLessonId) {
    return null;
  }

  return { id, siteId, classLessonId };
}

function clearForm(refs: FormRefs, state: AppState): void {
  refs.userId.value = "";
  refs.siteId.value = "";
  refs.classLessonId.value = "";
  refs.parseInput.value = "";

  refs.qrcode.innerHTML = "";
  refs.qrText.textContent = "还未生成签到码";
  refs.updateTime.textContent = "等待生成...";

  Object.values(STORAGE_KEYS).forEach((key) => localStorage.removeItem(key));
  stopAutoUpdate(state);
}

function persistFormValues(refs: FormRefs): void {
  localStorage.setItem(STORAGE_KEYS.userId, refs.userId.value);
  localStorage.setItem(STORAGE_KEYS.siteId, refs.siteId.value);
  localStorage.setItem(STORAGE_KEYS.classLessonId, refs.classLessonId.value);
}

function collectFormValues(refs: FormRefs): FormValues | null {
  const userId = refs.userId.value.trim();
  const siteId = refs.siteId.value.trim();
  const classLessonId = refs.classLessonId.value.trim();

  if (!userId || !siteId || !classLessonId) {
    return null;
  }

  return { userId, siteId, classLessonId };
}

function syncAutoUpdate(refs: FormRefs, state: AppState): void {
  if (refs.autoUpdate.checked && collectFormValues(refs)) {
    startAutoUpdate(refs, state);
  } else {
    stopAutoUpdate(state);
  }
}

function startAutoUpdate(refs: FormRefs, state: AppState): void {
  stopAutoUpdate(state);
  state.timer = window.setInterval(() => {
    const values = collectFormValues(refs);
    if (values) {
      void generateQrCode(refs, state, values);
    }
  }, CONFIG.AUTO_UPDATE_INTERVAL);
}

function stopAutoUpdate(state: AppState): void {
  if (state.timer !== null) {
    clearInterval(state.timer);
    state.timer = null;
  }
}

function openModal(refs: ModalRefs, template: HTMLTemplateElement): void {
  refs.body.innerHTML = "";
  refs.body.appendChild(template.content.cloneNode(true));
  refs.overlay.style.display = "block";
}

function closeModal(refs: ModalRefs): void {
  refs.overlay.style.display = "none";
}

function isModalOpen(refs: ModalRefs): boolean {
  return refs.overlay.style.display === "block";
}

function mustGet<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`缺少必须的元素: ${id}`);
  }
  return element as T;
}

function mustQuery<T extends HTMLElement>(selector: string): T {
  const element = document.querySelector(selector);
  if (!element) {
    throw new Error(`缺少必须的元素: ${selector}`);
  }
  return element as T;
}
