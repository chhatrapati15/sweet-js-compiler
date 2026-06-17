let editor;

const STORAGE_KEY = "sweetjs_code";

const els = {
  run: document.getElementById("run"),
  clear: document.getElementById("clear"),
  theme: document.getElementById("theme"),
  autorun: document.getElementById("autorun"),
  output: document.getElementById("output"),
  status: document.getElementById("status"),
  sandbox: document.getElementById("sandbox"),
};

let debounceId;

require.config({
  paths: {
    vs: "https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.52.2/min/vs",
  },
});

require(["vs/editor/editor.main"], () => {
  editor = monaco.editor.create(
    document.getElementById("editor"),
    {
      language: "javascript",
      theme: "vs-dark",
      automaticLayout: true,
      minimap: {
        enabled: true,
      },
      fontSize: 14,
      tabSize: 2,
      wordWrap: "on",
      value:
`// Welcome to Sweet JS Compiler

console.log("Hello World");
`
    }
  );

  const saved = localStorage.getItem(STORAGE_KEY);

  if (saved) {
    editor.setValue(saved);
  }

  editor.onDidChangeModelContent(() => {
    localStorage.setItem(
      STORAGE_KEY,
      editor.getValue()
    );

    if (els.autorun.checked) {
      clearTimeout(debounceId);

      debounceId = setTimeout(
        runCode,
        700
      );
    }
  });

  editor.addCommand(
    monaco.KeyMod.CtrlCmd |
      monaco.KeyCode.Enter,
    () => runCode()
  );
});

function setStatus(text) {
  els.status.textContent = text;
}

function clearOutput() {
  els.output.innerHTML = "";
}

function appendLine(type, message) {
  const div = document.createElement("div");

  div.className = `log-line log-${type}`;

  div.textContent = message;

  els.output.appendChild(div);

  els.output.scrollTop =
    els.output.scrollHeight;
}

function runCode() {
  const code = editor.getValue();

  if (!code.trim()) return;

  clearOutput();

  setStatus("Running...");

  const srcdoc = `
<!DOCTYPE html>
<html>
<body>

<script>

(async () => {

const send =
(type,msg) =>
parent.postMessage(
  {type,msg},
  "*"
);

function safeStringify(obj){

 const seen = new WeakSet();

 return JSON.stringify(
  obj,
  (key,val) => {

   if(
    typeof val === "object"
    && val !== null
   ){

    if(seen.has(val)){
      return "[Circular]";
    }

    seen.add(val);
   }

   return val;
  },
  2
 );
}

["log","warn","error","info"]
.forEach(method => {

 const original =
 console[method];

 console[method] =
 (...args) => {

  send(
   method,
   args
   .map(arg =>
    typeof arg === "object"
    ? safeStringify(arg)
    : String(arg)
   )
   .join(" ")
  );

  original(...args);
 };

});

try {

 const fn =
 new Function(
 \`
 return (async () => {
 ${code}
 })();
 \`
 );

 const result =
 await fn();

 if(result !== undefined){

  send(
   "log",
   typeof result === "object"
   ? safeStringify(result)
   : String(result)
  );
 }

 send("done","success");

}
catch(error){

 send(
  "error",
  error.stack ||
  error.message
 );

 send("done","error");

}

})();

<\/script>

</body>
</html>
`;

  els.sandbox.srcdoc = srcdoc;
}

window.addEventListener(
  "message",
  (event) => {
    const data = event.data;

    if (!data?.type) return;

    if (data.type === "done") {
      setStatus(
        data.msg === "success"
          ? "Completed"
          : "Error"
      );

      return;
    }

    appendLine(
      data.type,
      data.msg
    );
  }
);

els.run.addEventListener(
  "click",
  runCode
);

els.clear.addEventListener(
  "click",
  () => {
    editor.setValue("");
    clearOutput();
  }
);

els.theme.addEventListener(
  "click",
  () => {
    const current =
      document.body.dataset.theme;

    if (current === "light") {
      monaco.editor.setTheme(
        "vs-dark"
      );

      document.body.dataset.theme =
        "dark";
    } else {
      monaco.editor.setTheme("vs");

      document.body.dataset.theme =
        "light";
    }
  }
);
