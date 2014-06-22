var App = (function (my) {
	var my = {};
	
	var fs = require('fs');
	var remote = require('remote');
	var dialog = remote.require('dialog');
	var sprintf = require('./libs/sprintf.min.js');
	var fsExtra = require("fs-extra");
	var path = require("path");
	var editor = ace.edit("editor");
	var markdown = require("marked");
	
	var browser = remote.getCurrentWindow();
	var aboutFilePath = __dirname + "/About.md";
	
	var $editor = $("#editor");
	var $controlPanel = $("#control-panel");
	var $about = $("#about");
	var $themeSwitcher = $("#themeSwitcher");
	var $fontSizeSwitcher = $("#fontSizeSwitcher");
	var $bufferSwitcher = $("#bufferSwitcher");
	var $showInvisibleChars = $("#showInvisibleChars");
	var $showIndentGuides = $("#showIndentGuides");
	var $showGutter = $("#showGutter");
	var $lineWrap = $("#lineWrap");
	var $printMargin = $("#printMargin");
	var $lineEndingsSwitcher = $("#lineEndingsSwitcher");
	var $languageModeSwitcher = $("#languageModeSwitcher");
	var $notification = $("#notification");
	var $help = $("#help");
	var $reloadApp = $("#reloadAppBtn");
	var $toggleDevTools = $("#toggleDevToolsBtn");
	var $closeControlPanel = $("#controlPanelBtn");
	
	var pages = [$editor, $controlPanel, $about, $help];
	var lastKeyCode = null;
	var notificationFadeOutSpeed = 1250;
	var configFilePath = __dirname + "/config/settings.json";
	var aceResourcePath = __dirname + "/libs/ace-min-noconflict";
	var newBufferName = "New.txt";
	var editorName = "fx";
	
	var welcomeTitle = "Welcome to " + editorName;
	var warningCloseBuffer = "Warning: Are you sure you want to close this buffer?";
	var warningCloseAllBuffers = "Warning: Are you sure you want to close all buffers?";	
	
	var fontSizes = ["12px", 
					 "14px",
					 "16px",
					 "18px",
					 "20px",
					 "22px"];
	
	var keyCodes = {
		b: 66,
		s: 83,
		n: 78,
		m: 77,
		o: 79,
		w: 119,
		tab: 9,
		f1: 112,
		f2: 113,
		f3: 114,
		f10: 121,
		f11: 122,
		f12: 123
	};
	
	var editorState = [];
	var currentBuffer = {};
	
	var openAboutFile = function() {
		return fs.readFileSync(aboutFilePath).toString();
	};
	
	var readFileSync = function(file) {
		return fs.readFileSync(file).toString();
	};
	
	var writeFileSync = function(filePath, content) {
		fs.writeFileSync(filePath, content);
	};
	
	var setEditorTheme = function(editor, theme) {
		var t = theme;
		
		if (t === "kr") {
			t = "kr_theme"
		}
		
		editor.setTheme("ace/theme/" + t);
	};
	
	var setEditorFontSize = function(editor, size) {
		editor.setFontSize(size);
	};
	
	var watchEditorChangeEvent = function(session, func) {
		session.on("change", func);
	};
	
	var loadAndEnableEditorSnippets = function(editor, config) {
		config.loadModule("ace/ext/language_tools");
		editor.setOptions({
			enableBasicAutocompletion: true, 
			enableSnippets: true}
		);
	};

	var setEditorHighlightingMode = function(session, mode, func) {
		console.log("setEditorHighlightingMode called");
		if(mode) {
			session.setMode("ace/mode/" + mode);
		} else {
			session.setMode();
		}
		if(func) {
			func(mode);
		}
	};
	
	//function setEditorHighlightingMode(session, mode) {
	//	setEditorHighlightingMode(session, mode, null);
	//};
	
	var setHighlighting = function(session, ext, func) {
		switch(ext) {
			case ".less": setEditorHighlightingMode(session, "less", func); break;
			case ".css": setEditorHighlightingMode(session, "css", func); break;
			case ".html": setEditorHighlightingMode(session, "html", func); break;
			case ".htm": setEditorHighlightingMode(session, "html", func); break;
			case ".coffee": setEditorHighlightingMode(session, "coffee", func); break;
			case ".clj": setEditorHighlightingMode(session, "clojure", func); break;
			case ".cljs": setEditorHighlightingMode(session, "clojure", func); break;
			case ".js": setEditorHighlightingMode(session, "javascript", func); break;
			case ".java": setEditorHighlightingMode(session, "java", func); break;
			case ".cs": setEditorHighlightingMode(session, "csharp", func); break;
			case ".ps": setEditorHighlightingMode(session, "powershell", func); break;
			case ".rb": setEditorHighlightingMode(session, "ruby", func); break;
			case ".c": setEditorHighlightingMode(session, "c_cpp", func); break;
			case ".cc": setEditorHighlightingMode(session, "c_cpp", func); break;
			case ".cpp": setEditorHighlightingMode(session, "c_cpp", func); break;
			case ".h": setEditorHighlightingMode(session, "c_cpp", func); break;
			case ".hh": setEditorHighlightingMode(session, "c_cpp", func); break;
			case ".txt": setEditorHighlightingMode(session, "text", func); break;
			
			setEditorHighlightingMode(session, null, null);
		}
	};
	
	var clearEditor = function(editor) {
		editor.setValue("");
	};
	
	var showInvisibleChars = function(editor, result) {
		if(result) {
			editor.setShowInvisibles(true);
		} else {
			editor.setShowInvisibles(false);
		}
	};
	
	var showIndentGuides = function(editor, result) {
		if(result) {
			editor.setDisplayIndentGuides(true);
		} else {
			editor.setDisplayIndentGuides(false);
		}		
	};		

	var showGutter = function(editor, result) {
		if(result) {
			editor.renderer.setShowGutter(true);
		} else {
			editor.renderer.setShowGutter(false);
		}
		rerenderEditor();
	};
		
	var setLineEndingsMode = function(editor, mode) {
		editor.getSession().setNewLineMode(mode);
	};
		
	var setLineWrap = function(editor, lines) {
		var session = editor.getSession();
		
		if(lines > 0) {
			session.setUseWrapMode(true)
			session.setWrapLimitRange(lines, lines);
		} else {
			session.setUseWrapMode(false);
			session.setWrapLimitRange(null, null);
		}
	};

	var setPrintMargin = function(editor, column) {
		editor.setPrintMarginColumn(column);
	};
					
	var getResourceList = function(resourcePath, prefix) {
		var files = fs.readdirSync(resourcePath);
		var regex = new RegExp("^" + prefix + "-(.*)\\.js$");
		
		var resources = _.map(files, function(f) {
			var m = regex.exec(f);
			if(m !== undefined && m !== null) {
				return m[1];
			}
		});
		
		var filtered = _.filter(resources, function(r) {
			return (r !== undefined && r !== null);
		});
		
		return filtered;
	};
	
	var createOption = function(elem, val) {
		elem.append(sprintf.sprintf("<option value='%s'>%s</option>", val, val));
	};
	
	var fillSelectWithOptions = function(elem, items) {		
		return _.map(items, function(i) {
			createOption(elem, i);
		});
	};
	
	var bindElementEvent = function(elem, event, callback) {
		elem.bind(event, function() {
			callback(this);
		});
	};
	
	var fillBufferListWithNames = function() {
		var names = _.pluck(editorState, 'fileName');
		names = names.sort();
		
		$bufferSwitcher.html("");
		
		fillSelectWithOptions($bufferSwitcher, names);
	};
	
	var setEditorTitle = function(title) {
		if(title === "" || title === undefined) {
			title = currentBuffer.fileName;
		}
		
		console.log("setEditorTitle = " + title);
		if(title.indexOf(currentBuffer.fileName) !== 0) {
			document.title = sprintf.sprintf("%s - [%s]", editorName, title);
		} else {
			document.title = sprintf.sprintf("%s - [%s] (Lines: %d)", editorName, title, editor.getSession().getLength());
		}
	};

	var switchBuffer = function(buffer) {
		console.log("buffer.file: " + buffer.fileName);
				
		editor.setSession(buffer.session);
		buffer.session.setUndoManager(buffer.undoManager);
		setEditorTitle(buffer.fileName);
		$bufferSwitcher.val(currentBuffer.fileName);

		if(buffer.filePath !== "") {
			setHighlighting(buffer.session, path.extname(buffer.filePath), function(m) {
				console.log("file ext: " + path.extname(buffer.filePath));
				$languageModeSwitcher.val(m);
			});
		}
		
		currentBuffer = buffer;
	};
	
	var insertNewBuffer = function(file) {
		var newBuffer = {};
		
		//console.log("file: " + file);
		
		if(file !== null && file !== undefined) {
			var text = readFileSync(file);
			
			newBuffer = {fileName: path.basename(file),
						 filePath: file,
						 text: text,
						 session: new ace.EditSession(text, "text")};
		} else {
			newBuffer = {fileName: sprintf.sprintf("%s %d", newBufferName, editorState.length),
						 session: new ace.EditSession("", "text")};
		}
		
		newBuffer.undoManager = new ace.UndoManager();
		editorState.push(newBuffer);
		fillBufferListWithNames();
		setHighlighting(newBuffer.session, ".txt", function(m) {
			$languageModeSwitcher.val(m);
		});
		
		watchEditorChangeEvent(newBuffer.session, function(e) {
			currentBuffer.text = editor.getValue();
			if (currentBuffer.text.length > 0) {
				setEditorTitle(currentBuffer.fileName + "*");
			} else {
				setEditorTitle(currentBuffer.fileName);
			}
		}, newBuffer);
		
		console.log("returning new buffer: " + newBuffer.fileName);
		
		return newBuffer;
	};

	var insertNewBufferAndSwitch = function() {
		switchBuffer(insertNewBuffer());
	};

	var rerenderEditor = function() {		
		editor.renderer.updateFull();
		editor.resize(true);
	};
	
	var togglePage = function(elem, func) {
		_.forEach(pages, function(p) {
			p.fadeOut("fast");
		});

		if (elem.is(":visible")) {
			$editor.fadeIn("fast");
			rerenderEditor();
			setEditorTitle();			
		} else {
			elem.fadeIn("fast");
			if(func) {
				func();
			}
		}
	};
	
	var writeConfig = function() {
		var configFile = {
			theme: $themeSwitcher.val(),
			fontSize: $fontSizeSwitcher.val(),
			showInvisibleChars: $showInvisibleChars.prop("checked"),
			showIndentGuides: $showIndentGuides.prop("checked"),
			showGutter: $showGutter.prop("checked"),
			lineWrap: $lineWrap.prop("checked"),
			printMargin: $printMargin.prop("checked"),
			lineEndingsMode: $lineEndingsSwitcher.val()
		};
		var json = JSON.stringify(configFile);
		fsExtra.mkdirsSync(path.dirname(configFilePath));
		writeFileSync(configFilePath, json);
	}
	
	var setEditorPropsFromConfig = function(config) {
		if(config) {
			setEditorTheme(editor, config.theme);
			setEditorFontSize(editor, config.fontSize);
			$themeSwitcher.val(config.theme);
			$fontSizeSwitcher.val(config.fontSize);
	
			$showInvisibleChars.prop({checked: config.showInvisibleChars});
			showInvisibleChars(editor, config.showInvisibleChars);
			
			$showIndentGuides.prop({checked: config.showIndentGuides});
			showIndentGuides(editor, config.showIndentGuides);
			
			$showGutter.prop({checked: config.showGutter});
			showGutter(editor, config.showGutter);
			
			$lineEndingsSwitcher.val(config.lineEndingsMode);
			
			if (config.lineWrap) {
				setLineWrap(editor, 80);
			} else {
				setLineWrap(editor, 0);
			}
			
			$lineWrap.prop({checked: config.lineWrap});
			
			if (config.printMargin) {
				setPrintMargin(editor,80);
			} else {
				setPrintMargin(editor, -1);
			}

			$printMargin.prop({checked: config.printMargin});
			setLineEndingsMode(editor, config.lineEndingsMode);
		} else {
			setEditorTheme(editor, $themeSwitcher.val());
			setEditorFontSize(editor, $fontSizeSwitcher.val());
			writeConfig();
		}
	};
	
	var readConfig = function(func) {
		var exists = fs.existsSync(configFilePath);
	
		if(exists) {
			fs.readFile(configFilePath, function(error, data) {
				if(!error) {
					func(data);
				}
			});
		} else {
			func(null);
		}
	};
	
	var open = function(files) {
		//console.log("open files: " + files);
		
		var newBuffers = _.map(files, function(f) {
			return insertNewBuffer(f);
		});
		
		//console.log(newBuffers);
		
		switchBuffer(_.take(newBuffers));
	};
	
	var fileOpenDialogChangeEvent = function(results) {
		open(results);
	};

	var openFileDialog = function() {		
		dialog.showOpenDialog({ properties: [ 'openFile', 'multiSelections' ]}, function(f) {
			fileOpenDialogChangeEvent(f);
		});
	};
	
	var save = function() {
		writeFileSync(currentBuffer.filePath, currentBuffer.text);
		setEditorTitle();
	};

	var fileSaveAsDialogChangeEvent = function(result) {
		console.log("saving + " + result);
		
		currentBuffer.fileName = path.extname(result);
		currentBuffer.filePath = result;
		save();
		switchBuffer(currentBuffer);
	};
	
	var saveOrSaveAsFile = function() {		
		if(currentBuffer !== undefined && currentBuffer.filePath !== "" && currentBuffer.filePath !== undefined) {
			save();
		} else {
			dialog.showSaveDialog(function(f) {
				console.log("finished with save dialog");
				fileSaveAsDialogChangeEvent(f);
			});
		}
	};
	
	var cycleBuffer = function() {
		//	(when (> (alength (to-array @editor-state)) 1)
		//		(let [curr-index (first (util/indices #(= @current-buffer %) @editor-state))
		//			  first-part (take curr-index @editor-state)
		//			  last-part (util/nthrest @editor-state curr-index)
		//			  new-buffer-order (flatten (merge first-part last-part))]			  
		//			  (switch-buffer (second new-buffer-order)))))
	};

	var cycleEditorThemes = function() {
		//	(when (> (alength (to-array ace-themes)) 1)		
		//		(let [curr-theme (jq/val $theme-switcher)
		//			  curr-index (first (util/indices #(= curr-theme %) ace-themes))
		//			  first-part (take curr-index ace-themes)
		//			  last-part (util/nthrest ace-themes curr-index)
		//			  new-theme-order (flatten (merge first-part last-part))
		//			  next-theme (second new-theme-order)]
		//			;(util/log (str "next-theme: " next-theme))				
		//			(jq/val $theme-switcher next-theme)
		//			(.trigger $theme-switcher "change"))))
	};
					
	var closeBuffer = function() {
		//	(when-not (empty? @editor-state)
		//		(when (js/confirm warning-close-buffer)
		//			(let [new-state (util/find-map-without @editor-state :file-name (:file-name @current-buffer))]
		//				;(util/log (str "new-state: " new-state))
		//				(reset! editor-state new-state)
		//				(fill-buffer-list-with-names) 
		//				(if-not (empty? @editor-state)
		//					(switch-buffer (last @editor-state))
		//					(switch-buffer (insert-new-buffer)))))))
	};

	var closeAllBuffers = function() {
		if (confirm(warningCloseAllBuffers)) {
			editorState = [];
			fillBufferListWithNames();
			switchBuffer(insertNewBuffer);
		}
	};

	var editorStateWithoutNewEmptyFiles = function() {
		//(let [new-state (filter #(if-not (and (util/starts-with (:file-name %) new-buffer-name) (empty? (:text %))) %) @editor-state)]
		//new-state))
		
		return _.filter(editorState, function(f) {
			if(f.fileName.indexOf(newBufferName) == 0 && f.text !== "") {
				return f;
			}
		});		
	};

	var reloadApp = function () {
		browser.reload();
	};

	var toggleDevTools = function () {
		browser.toggleDevTools();
	};
	
	var documentOnkeydown = function(e) {
		if(lastKeyCode === e.keyCode) {
			return;
		}
		
		function keyBindWithCtrl(k, fun) {
			if(e.ctrlKey && !e.altKey && k === e.keyCode){
				fun();
				e.preventDefault();
			}
		};
		function keyBindWithCtrlAlt(k, fun) {
			if(e.ctrlKey && e.altKey && k === e.keyCode){
				fun();
				e.preventDefault();
			}
		};
		function keyBindWithAlt(k, fun) {
			if(e.altKey && !e.ctrlKey && k === e.keyCode){
				fun();
				e.preventDefault();
			}
		};
		function keyBind(k, fun) {
			if(k === e.keyCode) {
				lastKeyCode = e.keyCode;
				fun();
				e.preventDefault();
			}
		}
		
		keyBindWithCtrlAlt(keyCodes.b, reloadApp);
		keyBindWithCtrl(keyCodes.n, insertNewBufferAndSwitch);
		keyBindWithCtrl(keyCodes.o, openFileDialog);
		keyBindWithCtrl(keyCodes.s, saveOrSaveAsFile);
		keyBindWithCtrl(keyCodes.m, closeBuffer);
		keyBindWithCtrlAlt(keyCodes.m, closeAllBuffers);
		keyBindWithCtrl(keyCodes.tab, cycleBuffer);
		keyBindWithCtrl(keyCodes.w, writeConfig);
		keyBind(keyCodes.f2, function() {			
			togglePage($controlPanel, function() { 				
				setEditorTitle("Control Panel");
			});
		});
		keyBind(keyCodes.f3, cycleEditorThemes);
		keyBind(keyCodes.f10, function() {
			togglePage($help, function() {
				setEditorTitle("Help");
			});
		});
		keyBind(keyCodes.f11, function() {			
			togglePage($about, function() {
				setEditorTitle("About");
			});
		});
		keyBind(keyCodes.f12, toggleDevTools);	
		
		return e;
	};
				
	var bufferSwitcherChangeEvent = function(fileName) {		
		var buffers = _.map(editorState, function(f) {
			if(f.fileName !== fileName) {
				return f;
			}
		});
		
		switchBuffer(_.take(buffers));
	};

	var displayNotification = function(msg) {
		$notification.html(msg);
		$notification.fadeIn("slow", function() {
			window.setTimeout(function() {
				$notification.fadeOut("slow");
			}, notificationFadeOutSpeed);
		});
	};
		
	var bindEvents = function() {
		//bindElementEvent($fileOpenDialog, 'change', function(f) { fileOpenDialogChangeEvent(f); });
		//(util/bind-element-event $file-save-as-dialog :change #(file-save-as-dialog-change-event %))
		bindElementEvent($bufferSwitcher, "change", function(b) {
			bufferSwitcherChangeEvent(b.value);
			togglePage($editor, function() { 
				setEditorTitle();
			});
		});
		bindElementEvent($themeSwitcher, "change", function(t) {
			setEditorTheme(editor, t.value);
			displayNotification(sprintf.sprintf("Theme: %s", t.value));
			writeConfig();
		});
		bindElementEvent($languageModeSwitcher, "change", function(l) {
			setEditorHighlightingMode(editor.getSession(), l.value);
		});
		bindElementEvent($fontSizeSwitcher, "change", function(f) {
			setEditorFontSize(editor, f.value);
			writeConfig();
		});
		bindElementEvent($showInvisibleChars, "click", function(i) {
			showInvisibleChars(editor, i.checked);
		});
		bindElementEvent($showIndentGuides, "click", function(i) {
			showIndentGuides(editor, i.checked);
		});
		bindElementEvent($showGutter, "click", function(v) { showGutter(editor, v.checked); });
		bindElementEvent($lineWrap, "click", function(l) {
			setLineWrap(editor, 80);
		});
		bindElementEvent($printMargin, "click", function(p) {
			if (p.checked) {
				setPrintMargin(editor, 80);
			} else {			
				setPrintMargin(editor, -1);
			}
		});
		bindElementEvent($lineEndingsSwitcher, "change", function(e) {
			setLineEndingsMode(editor, e.value);
		});
		bindElementEvent($closeControlPanel, "click", function() {
			togglePage($editor, function() { 				
				setEditorTitle();
			});
		});
		bindElementEvent($toggleDevTools, "click", function() {
			toggleDevTools();
		});
		bindElementEvent($reloadApp, "click", function() {
			reloadApp();
		});	
	};
	
	var documentOndrop = function(e) {
		var files = e.dataTransfer.files;
		e.preventDefault();
		editorState = editorStateWithoutNewEmptyFiles();
		open(files);
	};
		
	// ---- init ----------------------------------------------------------- //
	
	var aceThemes = getResourceList(aceResourcePath, "theme");

	$(document).ready(function() {
		var controlPanelInfo = $("#control-panel-info");
		controlPanelInfo.append("<br/>");
		controlPanelInfo.append("NodeJS: " + remote.process.version);
		controlPanelInfo.append(", Atom-Shell: " + remote.process.versions['atom-shell']);
	
		//	; The following hackery is to get around the key stealing by Ace. I wanted to use
		//	; the F2 key and apparently Ace is stealing the events on that key. This clears it up!
		//	;
		//	; Got the idea from here: http://japhr.blogspot.com/2013/03/ace-events-removing-and-handling.html
		//	;
		editor.keyBinding.origOnCommandKey = editor.keyBinding.onCommandKey;
		editor.keyBinding.onCommandKey = function(e, h, k) {
			if(e.keyCode === 113) {
				documentOnkeydown(e);
			} else {
				this.origOnCommandKey(e,h,k);
			}
		}
		window.ondragover = function(e) { e.preventDefault(); }
		window.ondrop = function(e) { e.preventDefault(); }
		document.ondrop = function(e) { documentOndrop(e); }
		document.onkeydown = function(e) { documentOnkeydown(e); }
		document.onkeyup = function(e) { lastKeyCode = null; }
		$about.html(markdown(openAboutFile()));
		showGutter(editor, false);
		setEditorTheme(editor, "chaos");
		loadAndEnableEditorSnippets(editor, ace.config);
		fillSelectWithOptions($themeSwitcher, aceThemes);
		fillSelectWithOptions($languageModeSwitcher, getResourceList(aceResourcePath, "mode"));
		fillSelectWithOptions($fontSizeSwitcher, fontSizes);
		window.onunload = function(e) {
			writeConfig(); 
		}
		readConfig(function(o) {
			setEditorPropsFromConfig(JSON.parse(o));
		});
		bindEvents();
		insertNewBufferAndSwitch();
	});
	
	return my;
}(App));