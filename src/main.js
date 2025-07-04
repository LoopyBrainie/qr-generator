// 等待DOM完全加载
document.addEventListener("DOMContentLoaded", function() {
  // 获取表单元素
  const userIdInput = document.getElementById('userId');
  const siteIdInput = document.getElementById('siteId');
  const classLessonIdInput = document.getElementById('classLessonId');
  const generateBtn = document.getElementById('generateBtn');
  const clearBtn = document.getElementById('clearBtn');
  const qrcodeDiv = document.getElementById('qrcode');
  const qrTextDiv = document.getElementById('qrText');
  const updateTimeDiv = document.getElementById('updateTime');
  const autoUpdateCheckbox = document.getElementById('autoUpdate');
  // 新增：获取解析签到码输入框和按钮
  const parseQrTextInput = document.getElementById('parseQrTextInput');
  const parseQrTextBtn = document.getElementById('parseQrTextBtn');
  
  // 更新间隔ID
  let updateInterval = null;
  // 用于追踪二维码实例
  let qrCodeInstance = null;
  
  // 初始化
  init();
  
  // 初始化函数
  function init() {
    console.log("初始化应用...");
    loadSavedValues();
    attachEventListeners();
    checkAutoUpdateStatus();
  }
  
  // 加载保存的值
  function loadSavedValues() {
    const savedUserId = localStorage.getItem('qr_userId') || '';
    const savedSiteId = localStorage.getItem('qr_siteId') || '';
    const savedClassLessonId = localStorage.getItem('qr_classLessonId') || '';
    
    userIdInput.value = savedUserId;
    siteIdInput.value = savedSiteId;
    classLessonIdInput.value = savedClassLessonId;
    
    if (savedUserId && savedSiteId && savedClassLessonId) {
      generateQRCode();
    }
  }
  
  // 附加事件监听器
  function attachEventListeners() {
    // 点击生成按钮
    generateBtn.addEventListener('click', generateQRCode);
    
    // 清除按钮
    clearBtn.addEventListener('click', clearForm);
    
    // 自动更新复选框变化
    autoUpdateCheckbox.addEventListener('change', toggleAutoUpdate);
    
    // 输入字段变化检测 - 实时保存
    [userIdInput, siteIdInput, classLessonIdInput].forEach(input => {
      input.addEventListener('input', function() {
        saveInputValues();
      });
    });
    
    // 新增：解析签到码按钮事件
    if (parseQrTextBtn) {
      parseQrTextBtn.addEventListener('click', function() {
        parseQrTextAndFillInputs();
      });
    }
  }
  
  // 保存输入值到本地存储
  function saveInputValues() {
    localStorage.setItem('qr_userId', userIdInput.value);
    localStorage.setItem('qr_siteId', siteIdInput.value);
    localStorage.setItem('qr_classLessonId', classLessonIdInput.value);
  }
  
  // 生成二维码
  function generateQRCode() {
    console.log("开始生成二维码...");
    
    // 获取并验证输入
    const userId = userIdInput.value.trim();
    const siteId = siteIdInput.value.trim();
    const classLessonId = classLessonIdInput.value.trim();
    
    if (!userId || !siteId || !classLessonId) {
      alert("请填写所有必填字段");
      return;
    }
    
    try {
      // 保存当前输入
      saveInputValues();
      
      // 生成签到码文本 - 不包含时区信息
      const now = new Date();
      const timestamp = now.getFullYear() + '-' +
                        String(now.getMonth() + 1).padStart(2, '0') + '-' +
                        String(now.getDate()).padStart(2, '0') + 'T' +
                        String(now.getHours()).padStart(2, '0') + ':' +
                        String(now.getMinutes()).padStart(2, '0') + ':' +
                        String(now.getSeconds()).padStart(2, '0') + '.' +
                        String(now.getMilliseconds()).padStart(3, '0');
      
      const qrText = `checkwork|id=${userId}&siteId=${siteId}&createTime=${timestamp}&classLessonId=${classLessonId}`;
      
      // 显示签到码文本
      qrTextDiv.textContent = qrText;
      
      // 更新时间显示
      updateTimeDiv.textContent = `最后更新: ${new Date().toLocaleString()}`;
      
      // 生成二维码
      generateQRCodeImage(qrText);
      
      // 检查并开始自动更新
      checkAutoUpdateStatus();
      
    } catch (error) {
      console.error("生成二维码出错:", error);
      qrcodeDiv.innerHTML = '<p style="color:red;text-align:center;">生成二维码失败</p>';
    }
  }
  
  // 生成二维码图像
  function generateQRCodeImage(text) {
    // 清空二维码容器
    qrcodeDiv.innerHTML = '';
    
    // 创建新二维码
    qrCodeInstance = new QRCode(qrcodeDiv, {
      text: text,
      width: 256,
      height: 256,
      colorDark: "#000000",
      colorLight: "#ffffff",
      correctLevel: QRCode.CorrectLevel.H
    });
    
    console.log("二维码已生成");
  }
  
  // 切换自动更新状态
  function toggleAutoUpdate() {
    if (autoUpdateCheckbox.checked) {
      startAutoUpdate();
    } else {
      stopAutoUpdate();
    }
  }
  
  // 开始自动更新
  function startAutoUpdate() {
    if (updateInterval) {
      clearInterval(updateInterval);
    }
    
    // 每5秒更新一次
    updateInterval = setInterval(generateQRCode, 5000);
    console.log("自动更新已启动");
  }
  
  // 停止自动更新
  function stopAutoUpdate() {
    if (updateInterval) {
      clearInterval(updateInterval);
      updateInterval = null;
      console.log("自动更新已停止");
    }
  }
  
  // 检查是否应该启动自动更新
  function checkAutoUpdateStatus() {
    if (autoUpdateCheckbox.checked && 
        userIdInput.value.trim() && 
        siteIdInput.value.trim() && 
        classLessonIdInput.value.trim()) {
      startAutoUpdate();
    } else {
      stopAutoUpdate();
    }
  }
  
  // 清除表单
  function clearForm() {
    userIdInput.value = '';
    siteIdInput.value = '';
    classLessonIdInput.value = '';
    
    qrcodeDiv.innerHTML = '';
    qrTextDiv.textContent = '还未生成签到码';
    updateTimeDiv.textContent = '等待生成...';
    
    // 清除本地存储
    localStorage.removeItem('qr_userId');
    localStorage.removeItem('qr_siteId');
    localStorage.removeItem('qr_classLessonId');
    
    // 停止自动更新
    stopAutoUpdate();
    
    console.log("表单已清除");
  }
  
  // 模态对话框相关功能
  const modalOverlay = document.getElementById('modalOverlay');
  const modalBody = document.getElementById('modalBody');
  const closeButton = document.querySelector('.close-button');
  const declarationTemplate = document.getElementById('declarationContent');
  const licenseTemplate = document.getElementById('licenseContent');
  
  // 显示软件声明
  document.getElementById('showDeclaration').addEventListener('click', (e) => {
    e.preventDefault();
    modalBody.innerHTML = '';
    modalBody.appendChild(declarationTemplate.content.cloneNode(true));
    modalOverlay.style.display = 'block';
  });
  
  // 显示许可证
  document.getElementById('showLicense').addEventListener('click', (e) => {
    e.preventDefault();
    modalBody.innerHTML = '';
    modalBody.appendChild(licenseTemplate.content.cloneNode(true));
    modalOverlay.style.display = 'block';
  });
  
  // 关闭模态对话框
  closeButton.addEventListener('click', () => {
    modalOverlay.style.display = 'none';
  });
  
  // 点击对话框外部区域关闭
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) {
      modalOverlay.style.display = 'none';
    }
  });
  
  // ESC键关闭对话框
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modalOverlay.style.display === 'block') {
      modalOverlay.style.display = 'none';
    }
  });
  
  // 新增：解析签到码文本并填充输入框
  function parseQrTextAndFillInputs() {
    if (!parseQrTextInput) return;
    const qrText = parseQrTextInput.value.trim();
    // 标准格式：checkwork|id=xxx&siteId=yyy&createTime=zzz&classLessonId=kkk
    const match = qrText.match(/id=([^&]*)&siteId=([^&]*)&createTime=[^&]*&classLessonId=([^&]*)/);
    if (match) {
      userIdInput.value = match[1];
      siteIdInput.value = match[2];
      classLessonIdInput.value = match[3];
      // 保存并生成二维码
      saveInputValues();
      generateQRCode();
    } else {
      alert('签到码格式不正确，无法解析。');
    }
  }
});
