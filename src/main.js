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
      
      // 生成签到码文本
      const timestamp = new Date().toISOString();
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
});
