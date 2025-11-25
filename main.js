// ===== CONFIGURAÇÃO INICIAL =====
let config = {
  isUseSupabase: true,
  supabaseUrl: null,
  supabaseKey: null,
  webhookUrl: null,
  tableName: null,
  chatTitle: null,
  enableAudioRecording: true, // Controla botão de áudio
  enableFileUpload: true, // Controla botão de arquivo
};

// Função para remover o loading
function hideLoading() {
  const loadingScreen = document.getElementById("loadingScreen");
  if (loadingScreen) {
    loadingScreen.classList.add("hide");
    // Remove completamente do DOM após a animação
    setTimeout(() => {
      loadingScreen.remove();
    }, 500);
  }
}

function showErrorScreen(missingCredentials = []) {
  hideLoading();

  const errorScreen = document.getElementById("errorScreen");
  const errorList = document.getElementById("errorList");
  const chatContainer = document.getElementById("chatContainer");

  if (chatContainer) chatContainer.style.display = "none";

  errorList.innerHTML = "";

  const credentialLabels = {
    supabaseUrl: "URL do Supabase",
    supabaseKey: "Chave do Supabase",
    webhookUrl: "URL do Webhook",
    tableName: "Nome da Tabela",
  };

  for (const cred of missingCredentials) {
    const li = document.createElement("li");
    li.innerHTML = `
      <i class="fas fa-times-circle"></i>
      <span>${credentialLabels[cred] || cred}</span>
    `;
    errorList.appendChild(li);
  }

  errorScreen.classList.add("active");
}

// Função para ocultar tela de erro
function hideErrorScreen() {
  const errorScreen = document.getElementById("errorScreen");
  const chatContainer = document.getElementById("chatContainer");

  errorScreen.classList.remove("active");

  if (chatContainer) {
    chatContainer.style.display = "flex";
  }
}

// Função para controlar visibilidade dos botões
function updateButtonsVisibility() {
  const fileBtn = document.getElementById("fileBtn");
  const audioBtn = document.getElementById("audioBtn");

  if (fileBtn) {
    fileBtn.style.display =
      config.enableFileUpload === undefined || config.enableFileUpload
        ? "flex"
        : "none";
  }

  if (audioBtn) {
    audioBtn.style.display =
      config.enableAudioRecording === undefined || config.enableAudioRecording
        ? "flex"
        : "none";
  }
}

// Função global para inicializar com credenciais
window.initializeChat = (credentials = {}) => {
  config = { ...config, ...credentials };

  // Atualiza visibilidade dos botões
  updateButtonsVisibility();
  const missing = [];

  if (config.isUseSupabase) {
    // 🔹 Se for usar Supabase, precisa dessas credenciais
    if (!config.supabaseUrl) missing.push("supabaseUrl");
    if (!config.supabaseKey) missing.push("supabaseKey");
    if (!config.tableName) missing.push("tableName");
  } else {
    // 🔹 Se não for usar Supabase, só precisa do webhook
    // if (!config.webhookUrl) missing.push("webhookUrl");
  }

  // if (missing.length > 0) {
  //   console.error("Credenciais faltando:", missing);
  //   showErrorScreen(missing);
  //   return false;
  // }

  // 🔹 Caso tudo esteja ok
  hideErrorScreen();
  loadConfig();
};

document.addEventListener("DOMContentLoaded", async () => {
  // Tenta carregar credenciais da URL como fallback
  const urlParams = new URLSearchParams(window.location.search);
  const urlCredentials = {
    supabaseUrl: urlParams.get("supabaseUrl"),
    supabaseKey: urlParams.get("supabaseKey"),
    webhookUrl: urlParams.get("webhookUrl"),
    tableName: urlParams.get("tableName"),
    chatTitle: urlParams.get("chatTitle"),
    // enableFileUpload: urlParams.get("enableFileUpload") !== "false", // Default true
    // enableAudioRecording: urlParams.get("enableAudioRecording") !== "false", // Default true
  };

  if (Object.values(urlCredentials).some((val) => val !== null)) {
    window.initializeChat(urlCredentials);
  } else {
    console.log(
      "Aguardando credenciais via initializeChat ou configuração manual...",
    );
    // Carrega com configuração padrão
    window.initializeChat();
  }

  // Remove o loading após carregar
  setTimeout(() => {
    hideLoading();
  }, 800); // Pequeno delay para suavizar

  // Evento para receber credenciais via postMessage (opcional)
  window.addEventListener("message", (event) => {
    if (event.data && typeof event.data === "object") {
      window.initializeChat(event.data);
    }
  });
});

let mediaRecorder;
let audioChunks = [];
let isRecording = false;

const messagesEl = document.getElementById("messages");
const sessionEl = document.getElementById("sessionInfo");
const inputEl = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendButton");
const fileBtn = document.getElementById("fileBtn");
const audioBtn = document.getElementById("audioBtn");
const fileInput = document.getElementById("fileInput");
const audioInput = document.getElementById("audioInput");
const configModal = document.getElementById("configModal");
const closeModal = document.getElementById("closeModal");
const configForm = document.getElementById("configForm");

let supabase = null;

function generateSessionId() {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  return `${timestamp}_${random}`;
}

const sessionId = generateSessionId();
sessionEl.innerHTML = `Sessão: ${sessionId.slice(-12)}`;

function formatTime(iso) {
  const d = new Date(iso);
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function changeFavicon(fileName) {
  const link =
    document.querySelector("link[rel~='icon']") ||
    document.createElement("link");
  link.rel = "icon";
  link.type = "image/x-icon";
  link.href = `/${fileName}`;
  document.head.appendChild(link);
}

function updateChatTitle() {
  const titleH = config.chatTitle || "VemMed";
  document.title = titleH;
  document.querySelector(".header-left h2").textContent = titleH;
}

function initSupabase() {
  if (!config.isUseSupabase) return false;
  if (!config.supabaseUrl || !config.supabaseKey || !config.tableName) {
    console.error("Configurações do Supabase não definidas");
    const missing = [];
    if (!config.supabaseUrl) missing.push("supabaseUrl");
    if (!config.supabaseKey) missing.push("supabaseKey");
    if (!config.tableName) missing.push("tableName");
    showErrorScreen(missing);
    return false;
  }
  supabase = window.supabase.createClient(
    config.supabaseUrl,
    config.supabaseKey,
  );
  return true;
}

function loadConfig() {
  // if (!config.supabaseUrl || !config.supabaseKey) return;

  updateUIConfig();
  updateChatTitle();
  updateButtonsVisibility(); // Atualiza botões

  // if (initSupabase()) {
  //   loadMessages();
  //   subscribeToChanges();
  // }
  if (config.isUseSupabase) {
    if (initSupabase()) {
      loadMessages();
      subscribeToChanges();
    }
  } else {
    console.log("🟢 Rodando em modo Webhook-only (sem Supabase)");
  }
}

function updateUIConfig() {
  document.getElementById("supabaseUrl").value = config.supabaseUrl || "";
  document.getElementById("supabaseKey").value = config.supabaseKey || "";
  document.getElementById("webhookUrl").value = config.webhookUrl || "";
  document.getElementById("tableName").value = config.tableName || "";
  document.getElementById("chatTitleInput").value = config?.chatTitle || "";
}

function saveConfig() {
  updateChatTitle();

  if (initSupabase()) {
    messagesEl.innerHTML = "";
    loadMessages();
    subscribeToChanges();
    alert("Configurações salvas com sucesso!");
  }
  configModal.classList.remove("active");
}

function addMessage({
  type,
  content,
  created_at = new Date().toISOString(),
  mediaType = null,
}) {
  const msg = document.createElement("div");
  msg.className = `message ${type === "ai" ? "assistant" : "user"}`;
  let contentHTML = "";

  const isBase64 = isLikelyBase64(content);

  if (isBase64 && mediaType === "audio") {
    const audioSrc = `data:audio/webm;base64,${content}`;
    contentHTML = `
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px; font-weight: 500;">
        <i class="fas fa-volume-up"></i>
        <span>Áudio (${Math.round(content.length / 1000)}KB)</span>
      </div>
      <div class="audio-player">
        <audio controls preload="metadata" style="width: 100%; margin-top: 4px;" aria-label="Mensagem de áudio">
          <source src="${audioSrc}" type="audio/webm">
          <source src="${audioSrc}" type="audio/ogg">
          <source src="${audioSrc}" type="audio/wav">
          Seu navegador não suporta o elemento de áudio.
        </audio>
      </div>
    `;
  } else if (content === "Digitando...") {
    contentHTML = `
      <div class="typing-bubble" role="status" aria-live="polite">
        <span>Digitando</span>
        <div class="dots" aria-hidden="true"><span></span><span></span><span></span></div>
      </div>
    `;
  } else if (isBase64 && mediaType === "image") {
    const imgSrc = `data:${mediaType};base64,${content}`;
    contentHTML = `
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px; font-weight: 500;">
        <i class="fas fa-image apply-color" style="color: #1cc08d;" aria-hidden="true"></i>
        <span>Imagem</span>
      </div>
      <img src="${imgSrc}" alt="Imagem enviada" loading="lazy" style="max-width: 100%; max-height: 300px; border-radius: 8px; margin-top: 4px;"
           onerror="this.style.display='none'; this.nextElementSibling.style.display='block';"
           onload="this.style.display='block'; this.nextElementSibling.style.display='none';">
      <div style="display: none; color: #666; font-style: italic;">Erro ao carregar imagem</div>
    `;
  } else {
    // Escapar HTML para segurança
    const safeContent = content?.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>") || "";
    contentHTML = `<div>${safeContent}</div>`;
  }

  msg.innerHTML = `${contentHTML}<div class="timestamp">${formatTime(created_at)}</div>`;
  
  // Use requestAnimationFrame para otimizar o rendering
  requestAnimationFrame(() => {
    messagesEl.appendChild(msg);
    
    // Smooth scroll otimizado
    const isNearBottom = messagesEl.scrollHeight - messagesEl.scrollTop - messagesEl.clientHeight < 150;
    
    if (isNearBottom || type === "user") {
      // Scroll apenas se já estiver perto do final ou for mensagem do usuário
      requestAnimationFrame(() => {
        messagesEl.scrollTo({ 
          top: messagesEl.scrollHeight, 
          behavior: "smooth" 
        });
      });
    }
  });
  
  return msg;
}

function isLikelyBase64(str) {
  if (!str || typeof str !== "string") return false;
  if (str.length < 50) return false;
  if (str.includes("://") || str.includes("http") || str.includes("www."))
    return false;
  if (str.startsWith("data:")) return false;
  const base64Chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
  const validChars = str.split("").filter((char) => base64Chars.includes(char));
  return validChars.length / str.length > 0.95 && str.length > 100;
}

async function loadMessages() {
  if (!supabase) return;
  const { data, error } = await supabase
    .from(config.tableName)
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });
  if (error) {
    console.error("Erro ao carregar:", error);
    return;
  }
  messagesEl.innerHTML = "";
  for (const { message, created_at } of data) {
    if (message?.content) {
      addMessage({ type: message.type, content: message.content, created_at });
    }
  }
}

async function sendToWebhook({
  message,
  messageType = "text",
  fileData = null,
}) {
  const body = {
    message,
    session_id: sessionId,
    action: "sendMessage",
    messageType,
  };
  if (fileData) body.file = fileData;
  const response = await fetch(config.webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);
  return response.json();
}

async function sendMessage() {
  const text = inputEl.value.trim();
  if (!text) return;
  
  // Verifica conexão antes de enviar
  if (!navigator.onLine) {
    addMessage({ 
      type: "ai", 
      content: "Você está offline. Por favor, verifique sua conexão com a internet." 
    });
    return;
  }
  
  // Desabilita botão de envio temporariamente
  sendBtn.disabled = true;
  sendBtn.style.opacity = "0.6";
  
  inputEl.value = "";
  inputEl.style.height = "auto"; // Reset altura
  
  addMessage({ type: "user", content: text });
  const loadingMsg = addMessage({ type: "ai", content: "Digitando..." });
  try {
    const response = await sendToWebhook({ message: text });
    if (loadingMsg.parentNode) loadingMsg.parentNode.removeChild(loadingMsg);
    addMessage({ content: response.output || "Sem resposta", type: "ai" });
  } catch (err) {
    if (loadingMsg.parentNode) loadingMsg.parentNode.removeChild(loadingMsg);
    
    let errorMessage = "Erro ao enviar mensagem";
    if (err.message.includes("Failed to fetch")) {
      errorMessage = "Erro de conexão. Verifique sua internet.";
    } else if (err.message.includes("timeout")) {
      errorMessage = "Tempo de resposta excedido. Tente novamente.";
    }
    
    addMessage({ type: "ai", content: errorMessage });
    console.error("Erro ao enviar mensagem:", err);
  } finally {
    // Reabilita botão de envio
    sendBtn.disabled = false;
    sendBtn.style.opacity = "1";
  }
}

async function uploadFile() {
  const file = fileInput.files[0];
  if (!file) return;
  
  // Validação de tamanho (max 10MB)
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    addMessage({ 
      type: "ai", 
      content: "Arquivo muito grande. O tamanho máximo é 10MB." 
    });
    fileInput.value = "";
    return;
  }
  
  // Validação de tipo
  const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
  if (!allowedTypes.includes(file.type)) {
    addMessage({ 
      type: "ai", 
      content: "Tipo de arquivo não suportado. Use: JPG, PNG, GIF ou WebP." 
    });
    fileInput.value = "";
    return;
  }
  
  // Verifica conexão
  if (!navigator.onLine) {
    addMessage({ 
      type: "ai", 
      content: "Você está offline. Conecte-se para enviar arquivos." 
    });
    fileInput.value = "";
    return;
  }
  
  let loadingMsg = null;
  fileBtn.disabled = true;
  
  try {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const base64Data = e.target.result.split(",")[1];
        addMessage({ type: "user", content: base64Data, mediaType: "image" });
        loadingMsg = addMessage({ type: "ai", content: "Digitando..." });
        
        const response = await sendToWebhook({
          message: base64Data,
          messageType: "image",
        });
        
        if (loadingMsg.parentNode) loadingMsg.parentNode.removeChild(loadingMsg);
        addMessage({
          type: "ai",
          content: response.output || "Arquivo processado",
        });
      } catch (err) {
        if (loadingMsg?.parentNode) loadingMsg.parentNode.removeChild(loadingMsg);
        addMessage({ content: "Erro ao processar arquivo no servidor", type: "ai" });
        console.error("Erro ao enviar arquivo:", err);
      }
    };
    
    reader.onerror = () => {
      addMessage({ content: "Erro ao ler arquivo", type: "ai" });
    };
    
    reader.readAsDataURL(file);
  } catch (err) {
    if (loadingMsg?.parentNode) loadingMsg.parentNode.removeChild(loadingMsg);
    addMessage({ content: "Erro ao processar arquivo", type: "ai" });
    console.error("Erro geral:", err);
  } finally {
    fileInput.value = "";
    fileBtn.disabled = false;
  }
}

async function toggleAudioRecording() {
  if (!isRecording) {
    // Verifica conexão antes de gravar
    if (!navigator.onLine) {
      addMessage({ 
        type: "ai", 
        content: "Você está offline. Conecte-se para enviar áudios." 
      });
      return;
    }
    
    try {
      // Verifica suporte a getUserMedia
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        addMessage({ 
          type: "ai", 
          content: "Seu navegador não suporta gravação de áudio." 
        });
        return;
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      // Verifica suporte a MediaRecorder
      if (!window.MediaRecorder) {
        addMessage({ 
          type: "ai", 
          content: "Gravação de áudio não suportada neste dispositivo." 
        });
        stream.getTracks().forEach(track => track.stop());
        return;
      }
      
      mediaRecorder = new MediaRecorder(stream);
      audioChunks = [];
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunks.push(e.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        try {
          const audioBlob = new Blob(audioChunks, { type: "audio/webm" });
          
          // Valida tamanho (max 5MB para áudio)
          const maxSize = 5 * 1024 * 1024;
          if (audioBlob.size > maxSize) {
            addMessage({ 
              type: "ai", 
              content: "Áudio muito longo. Grave mensagens menores." 
            });
            return;
          }
          
          const audioBase64 = await blobToBase64(audioBlob);
          addMessage({ content: audioBase64, type: "user", mediaType: "audio" });
          
          const loadingMsg = addMessage({ type: "ai", content: "Digitando..." });
          
          try {
            const response = await sendToWebhook({
              message: audioBase64,
              messageType: "audio",
            });
            
            if (loadingMsg.parentNode) {
              loadingMsg.parentNode.removeChild(loadingMsg);
            }
            
            addMessage({
              type: "ai",
              content: response.output || "Áudio processado",
            });
          } catch (err) {
            if (loadingMsg.parentNode) {
              loadingMsg.parentNode.removeChild(loadingMsg);
            }
            addMessage({ 
              content: "Erro ao processar áudio. Tente novamente.", 
              type: "ai" 
            });
            console.error("Erro ao enviar áudio:", err);
          }
        } catch (err) {
          addMessage({ 
            content: "Erro ao processar gravação de áudio.", 
            type: "ai" 
          });
          console.error("Erro ao processar blob de áudio:", err);
        }
      };
      
      mediaRecorder.onerror = (err) => {
        console.error("Erro no MediaRecorder:", err);
        addMessage({ 
          content: "Erro durante a gravação. Tente novamente.", 
          type: "ai" 
        });
        isRecording = false;
        audioBtn.classList.remove("recording");
      };
      
      mediaRecorder.start();
      isRecording = true;
      audioBtn.classList.add("recording");
      audioBtn.title = "Clique para parar a gravação";
      
    } catch (err) {
      console.error("Erro ao acessar microfone:", err);
      
      let errorMsg = "Erro ao acessar microfone.";
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        errorMsg = "Permissão para usar o microfone foi negada. Verifique as configurações do navegador.";
      } else if (err.name === "NotFoundError") {
        errorMsg = "Nenhum microfone encontrado no dispositivo.";
      } else if (err.name === "NotReadableError") {
        errorMsg = "Microfone está sendo usado por outro aplicativo.";
      }
      
      addMessage({ type: "ai", content: errorMsg });
    }
  } else {
    // Parar gravação
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
      
      // Para todas as tracks
      if (mediaRecorder.stream) {
        for (const track of mediaRecorder.stream.getTracks()) {
          track.stop();
        }
      }
    }
    
    isRecording = false;
    audioBtn.classList.remove("recording");
    audioBtn.title = "Gravar áudio";
  }
}

// ===== AUTO-RESIZE TEXTAREA =====
function autoResizeTextarea() {
  inputEl.style.height = "auto";
  inputEl.style.height = Math.min(inputEl.scrollHeight, 140) + "px";
}

// ===== EVENT LISTENERS =====
sendBtn.addEventListener("click", sendMessage);

inputEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

// Auto-resize com debounce
inputEl.addEventListener("input", debounce(autoResizeTextarea, 50));

// Limpar altura quando enviar mensagem
const originalSendMessage = sendMessage;
sendMessage = function() {
  originalSendMessage();
  inputEl.style.height = "auto";
};

// Prevenir zoom em iOS ao focar no input
if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
  inputEl.addEventListener("focus", () => {
    inputEl.style.fontSize = "16px";
  });
}

// Melhor UX para mobile: esconder teclado ao enviar
if ('ontouchstart' in window) {
  const originalSend = sendMessage;
  sendMessage = function() {
    originalSend();
    // Pequeno delay para melhor UX
    setTimeout(() => inputEl.focus(), 100);
  };
}

// Só adiciona listeners se os botões estiverem habilitados
if (config.enableFileUpload) {
  fileBtn.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", uploadFile);
}

if (config.enableAudioRecording) {
  audioBtn.addEventListener("click", toggleAudioRecording);
}

// closeModal.addEventListener("click", () =>
//   configModal.classList.remove("active"),
// );
// configForm.addEventListener("submit", (e) => {
//   e.preventDefault();
//   saveConfig();
// });
// configModal.addEventListener("click", (e) => {
//   if (e.target === configModal) configModal.classList.remove("active");
// });

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function subscribeToChanges() {
  if (!supabase) return;
  
  try {
    supabase
      .channel("chat_changes")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: config.tableName },
        (payload) => {
          const { message, created_at } = payload.new;
          if (message && message.role !== "user") {
            addMessage({
              type: message.role,
              content: message.content,
              created_at,
            });
          }
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log("✅ Inscrito em mudanças do chat");
        } else if (status === "CHANNEL_ERROR") {
          console.error("❌ Erro ao se inscrever no canal");
        }
      });
  } catch (err) {
    console.error("Erro ao configurar inscrição:", err);
  }
}

// ===== PERFORMANCE MONITORING (DEV) =====
if (window.performance && window.performance.mark) {
  window.addEventListener("load", () => {
    setTimeout(() => {
      const perfData = window.performance.timing;
      const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart;
      console.log(`⚡ Página carregada em ${pageLoadTime}ms`);
    }, 0);
  });
}

// ===== CLEANUP ON PAGE UNLOAD =====
window.addEventListener("beforeunload", () => {
  // Para gravação de áudio se estiver ativa
  if (isRecording && mediaRecorder) {
    mediaRecorder.stop();
    if (mediaRecorder.stream) {
      mediaRecorder.stream.getTracks().forEach(track => track.stop());
    }
  }
});

