
// CV Terminal Class - Start
class CVTerminal {
  terminal;
  isAnimating;
  command;
  addons;
  addonsConfig;
  prompt;
  promptLength;
  cursorX;
  printingFullCV;
  interrupted;
  commands;
  cvSections;
  cv;
  currentSectionIndex;
  animationFrameId;

  constructor(config) {
    this.config = config;
    this.initializeProperties();
    this.installAddons();
    this.openTerminal(this.config.container);
    this.fitTerminal();
    this.registerEvents();
    this.writeWelcomeMessage();
  }

  fitTerminal() {
    const fitAddon = this.addons["FitAddon"];
    fitAddon && fitAddon.fit();
  }

  openTerminal(container) {
    this.terminal.open(container);
    this.terminal.focus();
  }

  writeWelcomeMessage() {
    this.terminal.writeln("Hello There...");
    this.terminal.writeln("Type 'help' to see available commands.");
    this.writePrompt();
  }

  initializeProperties() {
    this.terminal = new Terminal(this.config.terminal);
    this.isAnimating = false;
    this.command = "";
    this.addons = {};
    this.addonsConfig = this.config.addons;
    this.prompt = this.config.cv.prompt;
    this.promptLength = this.prompt.length;
    this.cursorX = this.promptLength;
    this.printingFullCV = false;
    this.interrupted = false;
    this.commands = new Set(this.config.cv.commands);
    this.cvSections = new Set(this.config.cv.cvSections);
    this.cv = this.config.cv.cv;
    this.currentSectionIndex = 0;
    this.animationFrameId = -1;
  }

  installAddons() {
    this.addons = {};
    for (const addon of this.addonsConfig) {
      const addonConstructor = Object.values(addon.instance)[0];
      const addonInstance = new addonConstructor();
      this.addons[addon.instance.name] = addonInstance;
      this.terminal.loadAddon(addonInstance);
      if (addon.autoFit) {
        addonInstance.fit();
      }
    }
  }

  registerEvents() {
    this.terminal.onKey((event) => this.handleKeyEvent(event));
    window.addEventListener("resize", () => this.fitTerminal());

    document.addEventListener("click", (event) => {
      const isTerminalClick = event.composedPath().some((el) => el === this.terminal.element);
      if (isTerminalClick) {
        this.terminal.focus();
      } else if (!isTerminalClick) {
        this.terminal.blur();
      }
    });
  }

  handleKeyEvent({ key, domEvent }) {
    const isCtrlC = domEvent.ctrlKey && domEvent.key.toLowerCase() === "c";
    const isPrintable = !domEvent.altKey && !domEvent.ctrlKey && !domEvent.metaKey;

    const KEYCODE = {
      Backspace: "Backspace",
      Enter: "Enter",
      ArrowUp: "ArrowUp",
      ArrowDown: "ArrowDown",
      ArrowLeft: "ArrowLeft",
      ArrowRight: "ArrowRight",
    };

    if (this.isAnimating && isCtrlC) {
      return this.interruptAnimation();
    }
    if (this.isAnimating) return;

    switch (domEvent.key) {
      case KEYCODE.Backspace:
        this.handleBackspace();
        break;
      case KEYCODE.Enter:
        this.handleReturn();
        break;
      case KEYCODE.ArrowUp:
      case KEYCODE.ArrowDown:
      case KEYCODE.ArrowLeft:
      case KEYCODE.ArrowRight:
        break;
      default:
        if (isPrintable) {
          this.handleInput(key);
        }
    }
  }

  stopAnimation() {
    this.interrupted = false;
    this.isAnimating = false;
    cancelAnimationFrame(this.animationFrameId);
    this.resetFullCV();
  }

  handleBackspace() {
    if (this.cursorX > this.promptLength) {
      this.terminal.write("\b \b");
      this.cursorX--;
    }
  }

  handleReturn() {
    this.terminal.writeln("");
    this.handleCommand();
    this.command = "";
    this.cursorX = this.promptLength;
    if (!this.isAnimating) {
      this.writePrompt();
    }
  }

  handleInput(key) {
    this.terminal.write(key);
    this.command += key;
    this.cursorX++;
  }

  writePrompt() {
    this.terminal.write(this.prompt);
  }

  handleCommand() {
    const trimmedCommand = this.command.trim();

    if (this.commands.has(trimmedCommand)) {
      switch (trimmedCommand) {
        case "help":
          this.writeHelp();
          break;
        case "fullcv":
          this.startFullCV();
          break;
        default:
          this.writeSection(trimmedCommand);
      }
    } else {
      this.terminal.writeln(" ERROR: Command not recognized: " + trimmedCommand + "!");
      this.terminal.writeln("Type 'help' to see available commands.");
    }
  }

  writeHelp() {
    let helpText = "\n  AVAILABLE COMMANDS:\n\n";
    for (const cmd of this.commands) {
      helpText += "- " + cmd + "\n";
    }

    this.isAnimating = true;
    this.animateTyping(helpText, 0, () => {
      this.isAnimating = false;
      this.writePrompt();
    });
  }

  startFullCV() {
    this.printingFullCV = true;
    this.handleFullCVCommand();
  }

  writeSection(sectionName) {
    const section = "\n  " + sectionName.toUpperCase();
    this.terminal.writeln(section);
    const commandInfo = "\r\n" + this.cv[sectionName].join('\n');

    if (this.interrupted) return;

    this.isAnimating = true;
    this.animateTyping(commandInfo, 0, () => {
      this.isAnimating = false;
      if (this.printingFullCV) {
        this.handleFullCVCommand();
      } else {
        this.writePrompt();
      }
    });
  }

  handleFullCVCommand() {
    const cvSectionsArray = Array.from(this.cvSections);

    if (this.currentSectionIndex >= cvSectionsArray.length) {
      this.resetFullCV();
      this.writePrompt();
    } else {
      this.printingFullCV = true;
      const command = cvSectionsArray[this.currentSectionIndex];
      this.currentSectionIndex++;
      this.writeSection(command);
    }
  }

  resetFullCV() {
    this.currentSectionIndex = 0;
    this.printingFullCV = false;
  }

  animateTyping(text, pos, callback) {
    if (this.interrupted) {
      return this.stopAnimation();
    }

    if (pos < text.length) {
      this.terminal.write(text.charAt(pos));
      if (text.charAt(pos) === "\n") {
        this.terminal.write("\r");
      }
      this.animationFrameId = requestAnimationFrame(() =>
        this.animateTyping(text, pos + 1, callback)
      );
    } else {
      this.terminal.writeln("\r");
      this.isAnimating = false;
      callback && callback();
    }
  }

  interruptAnimation() {
    this.stopAnimation();
    this.terminal.write("\r\n\nInterrupted\r\n\n");
    this.writePrompt();
  }
}

// Initialize the terminal 
window.onload = () => {

  const addonsConfig = [
    { instance: FitAddon, autoFit: true },
    { instance: WebLinksAddon },
  ];

  
  const terminalSettings = {
    "fontSize": 9,
    "fontFamily": "'VT323', monospace", // Make sure 'VT323' is loaded as shown earlier
    "cursorStyle": "block",
    "cursorBlink": true,
    "theme": {
      "background": "#000000",
      "foreground": "#00ff00",
      "cursor": "#00ff00"
    },
    "cols": 50,
    "rows": 22
  };


  const cvInteraction = {
    "commands": [
      "about",
      "experience",
      "projects",
      "education",
      "certifications",
      "contact",
      "help"
    ],
    "cvSections": [
      "Zane about",
      "Zane's experience",
      "Zane's projects",
      "Zane's education",
      "certifications",
      "contact"
    ],
    "cv": {
      "about": [
        "Name: Zane Pearton",
        "Role: DevOps Engineer",
        "Company: Accenture",
        "As a DevOps Engineer at Accenture, I specialize in bridging the gap between software development and IT operations, fostering a culture of collaboration and faster product iteration. I am committed to creating and maintaining automated workflows that enhance system reliability and operational efficiency. My experience spans deploying and managing infrastructures across various environments, constructing resilient CI/CD pipelines, and configuring systems for optimized performance and security. Skilled in integrating and developing custom tools with technologies like AWS, Azure, Salesforce, Vlocity, and IBMz. Proficient in Git, GitHub, Azure DevOps, GitHub Actions, Java, Bash, JavaScript, Python, YAML, PowerShell, and adept with CLI tools such as Sfdx, Sfpowerkit, Sfpowerscripts, and npm packages, as well as IDEs like VS Code and Eclipse. My knowledge extends to advanced technologies such as Unreal Engine, Rhino, Revit, GH, 3DS Max, Adobe Creative Suite, Octane, 3D printing, VR with Oculus and Unity, and web development with a focus on UI design. Experienced in containerization with Docker, API sandboxing with Postman and Getsandbox, and event-driven architectures using webhooks and adaptive cards. Conversant with machine learning libraries TensorFlow and PyTorch, and capable in WordPress integration and web hosting. Driven by innovation, I aim to bring efficiency and precision to every project, ensuring smooth operations and high-quality delivery."
      ],
      "experience": [
        "DevOps Engineer | Custom Software Engineering Sr Analyst | Accenture DevOps Practice (Apr 2023 - Present, 8 mos)",
        "Key Responsibilities:",
        "• Deployment Delivery (Production/Test env)",
        "• Pipeline construction, maintenance",
        "• User Provisioning, Environment Configuration",
        "• DevOps, DevSecOps Tool Assessment",
        "• Custom Tooling - Integration / Development",
        "Technologies:",
        "• Cloud: AWS, Azure",
        "• CRM: Salesforce, Vlocity",
        "• Mainframe: IBMz",
        "• VCS: Git, Github",
        "• CI/CD: Azure DevOps, Github Actions",
        "• CLI Tools: Sfdx, Sfpowerkit, Sfpowerscripts, npm packages",
        "• IDEs: VS Code, Eclipse",
        "• Languages: Java, Cobol",
        "• Scripting: Bash, Javascript, Python, YAML, PowerShell",
        "• Repo Manager: NPM",
        "• Collaboration: JIRA, Confluence, Teams, Slack",
        "• Containerization: Docker",
        "• Security: Checkmarx",
        "• API Sandbox: Postman, Getsandbox",
        "• Event-driven: Webhooks, Adaptive Cards",
        "• Machine Learning Libs: Tensorflow, PyTorch",
        "• Wordpress Integration: beaver builder",
        "• Web Hosting: cPanel",
        "Skills: REST APIs, Reliability, Configuration Management, Automation, HTML, Gitlab, Infrastructure as Code (IaC), Analytical Skills, Azure DevOps, Microsoft Azure, Bash, GitHub, Jira, Python, VMware, Linux",

        "DevOps Engineer | Business & Integration Arch Sr Analyst | Accenture DevOps Practice (Nov 2022 - Apr 2023, 6 mos)",
        "• Responsibilities similar to the current role with a focus on Deployment Delivery, Pipeline construction, and DevOps tool assessment.",

        "Technology Consulting | DevOps Analyst | A&NZ DevOps Practice (Oct 2021 - Nov 2022, 1 yr 2 mos)",
        "Location: Melbourne, Victoria, Australia",
        "• Focused on Deployment Delivery, User Provisioning, and Environment Configuration.",
        "• Involved in DevOps and DevSecOps Tool Assessment, and worked extensively with a variety of technologies and tools listed above."
      ],
      "projects": [
        "Langchaingpt: A Python library for NLP and text processing.",
        "McDeepNet: Machine Learning model for analyzing McDonald's reviews.",
        "G-Net: TensorFlow implementation of GANs for image generation.",
        "neuroSnake: A ML-powered Snake game.",
        "MSGR-ChatApp: A chat application using React and Firebase."
      ],

      "education": [
        "RMIT - Masters in Architecture",
        "RMIT - Bachelor's in Architecture",
      ],
      "certifications": [
        "Microsoft Certified: Azure Data Scientist Associate - Feb 2023",
        "Microsoft Certified: Azure AI Engineer Associate - Dec 2022",
        "Microsoft Certified: Azure Data Engineer Associate - Dec 2022",
        "Microsoft Certified: Security, Compliance, and Identity Fundamentals - Dec 2022",
        "Microsoft Certified: Azure AI Fundamentals - Nov 2022",
        "Microsoft Certified: Azure Data Fundamentals - Nov 2022",
        "Microsoft Certified: Azure Fundamentals - Oct 2022",
        "Amazon Web Services Cloud Practitioner - Jan 2022",
        "Programming Essentials in Python - Python Software Foundation - Jan 2021",
        "Security Analyst - Skillsoft (Credential ID 27306224) - Jan 2021",
        "COBOL Programming with VSCode - IBM - Dec 2020",
        "Introduction to Cybersecurity - Cisco - Dec 2020",
        "NDG Linux Essentials - Cisco"
      ],
      "contact": [
        "LinkedIn: https://www.linkedin.com/in/zane-pearton",
        "GitHub: ZanePearton",
        "Linktree: https://linktr.ee/zanepearton"
      ]
    },
    "prompt": "root > "
  };


  const terminalConfigurations = {
    terminal: terminalSettings,
    cv: cvInteraction,
    addons: addonsConfig,
    container: document.querySelector("#terminal"),
  };

  new CVTerminal(terminalConfigurations);
}
