//
// A port of Frehley on Node-Webkit and Clojurescript to Atom-Shell and Javascript.
//
// https://github.com/frankhale/Frehley
// https://github.com/frankhale/fx
//
// Frank Hale <frankhale@gmail.com>
// Date: 22 June 2014
//

var App = (function (my) {
	"use strict";
	
	var fs = require('fs');
	var remote = require('remote');
	var dialog = remote.require('dialog');
	var _s = require('./libs/sprintf.min.js');
	var fsExtra = require("fs-extra");
	var path = require("path");
	var editor = ace.edit("editor");
	var markdown = require("marked");
	
	var browser = remote.getCurrentWindow();
	var aboutFilePath = __dirname + "/About.md";
	
	var $editor = $("#editor");
	var $controlPanel = $("#control-panel");
	var $about = $("#about");
	var $start = $("#start");
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
	var $controlPanelInfo = $("#control-panel-info");
	var $openFiles = $("#openFilesBtn");
	var $recentFiles = $("#recentFiles");
	
	var pages = [$editor, $controlPanel, $about, $help, $start];
	var lastKeyCode = null;
	var notificationFadeOutSpeed = 1250;
	var configFilePath = __dirname + "/config/settings.json";
	var recentFilesPath = __dirname + "/config/recentFiles.json";
	var aceResourcePath = __dirname + "/libs/ace-min-noconflict";
	var newBufferName = "new.txt";
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
	var recentFiles = [];
	var currentBuffer = {};
	
	var readFileSync = function(file) {
		return fs.readFileSync(file).toString();
	};
	
	var writeFileSync = function(filePath, content) {
		fs.writeFileSync(filePath, content);
	};
	
	var setEditorTheme = function(editor, theme) {
		var t = theme;
		
		if (t === "kr") {
			t = "kr_theme";
		}
		
		editor.setTheme("ace/theme/" + t);
	};
	
	var loadAndEnableEditorSnippets = function(editor, config) {
		ace.config.loadModule("ace/ext/language_tools", function() {
			editor.setOptions({
				enableSnippets: true,
				enableBasicAutocompletion: true
			});
		});
	};

	var setEditorHighlightingMode = function(session, mode, func) {		
		if(mode) {
			session.setMode("ace/mode/" + mode);
		} else {
			session.setMode();
		}
		if(func) {
			func(mode);
		}
	};
	
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
			default: 
				setEditorHighlightingMode(session, null, null);
			break;
		}
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
	
	var setLineWrap = function(editor, lines) {
		var session = editor.getSession();
		
		if(lines > 0) {
			session.setUseWrapMode(true);
			session.setWrapLimitRange(lines, lines);
		} else {
			session.setUseWrapMode(false);
			session.setWrapLimitRange(null, null);
		}
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
		elem.append(_s.sprintf("<option value='%s'>%s</option>", val, val));
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
		
		if(title.indexOf(currentBuffer.fileName) !== 0) {
			document.title = _s.sprintf("%s - [%s]", editorName, title);
		} else {
			document.title = _s.sprintf("%s - [%s] (Lines: %d)", editorName, title, editor.getSession().getLength());
		}
	};

	var switchBuffer = function(buffer) {
		currentBuffer = buffer;
		
		editor.setSession(currentBuffer.session);
		buffer.session.setUndoManager(currentBuffer.undoManager);
		setEditorTitle(currentBuffer.fileName);
		$bufferSwitcher.val(currentBuffer.fileName);

		if(buffer.filePath !== "") {
			setHighlighting(buffer.session, path.extname(currentBuffer.filePath), function(m) {
				$languageModeSwitcher.val(m);
			});
		}
	};
	
	var insertNewBuffer = function(file) {
		var newBuffer = {};
		
		if(file !== null && file !== undefined) {
			var text = readFileSync(file);
			
			newBuffer = {
				fileName: path.basename(file),
				filePath: file,
				text: text,
				session: ace.createEditSession(text, "text")
			};
		} else {
			newBuffer = {
				fileName: _s.sprintf("%s %d", newBufferName, editorState.length),
				session: ace.createEditSession("", "text")
			};
		}
		
		newBuffer.undoManager = newBuffer.session.getUndoManager();
		editorState.push(newBuffer);
		fillBufferListWithNames();
		setHighlighting(newBuffer.session, ".txt", function(m) {
			$languageModeSwitcher.val(m);
		});
		
		newBuffer.session.on("change", function(e) {
			currentBuffer.text = editor.getValue();
			if (currentBuffer.text.length > 0) {
				setEditorTitle(currentBuffer.fileName + "*");
			} else {
				setEditorTitle(currentBuffer.fileName);
			}
		});

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
	};
	
	var writeRecentFiles = function() {
		if(recentFiles.length > 0) {
			var json = JSON.stringify(_.flatten(recentFiles));
			fsExtra.mkdirsSync(path.dirname(recentFilesPath));
			writeFileSync(recentFilesPath, json);
		}
	};
	
	var setEditorPropsFromConfig = function(config) {
		if(config) {
			setEditorTheme(editor, config.theme);
			editor.setFontSize(config.fontSize);
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
				editor.setPrintMarginColumn(80);
			} else {
				editor.setPrintMarginColumn(-1);
			}

			$printMargin.prop({checked: config.printMargin});			
			editor.getSession().setNewLineMode(config.lineEndingsMode)
		} else {
			setEditorTheme(editor, $themeSwitcher.val());
			editor.setFontSize($fontSizeSwitcher.val());
			writeConfig();
		}
	};
	
	var appendRecentFilesToDOM = function(files) {
		$recentFiles.html("");
		
		files = _.take(_.uniq(files), 25);
		
		_.forEach(files, function(f) {
			$recentFiles.append(_s.sprintf("%s <br/>", f));
		});
	};
	
	var setRecentFilesFromConfig = function(config) {		
		if(config !== null && config.length !== 0) {
			recentFiles = JSON.parse(config);
			appendRecentFilesToDOM(recentFiles);
		} else {
			$recentFiles.html("There are no recently opened files");
		}
	};
	
	var readConfigFile = function(filePath, func) {
		var exists = fs.existsSync(filePath);
	
		if(exists) {
			fs.readFile(filePath, function(error, data) {
				if(!error) {
					func(data);
				}
			});
		} else {
			func(null);
		}
	};
	
	var open = function(files) {
		var newBuffers = _.map(files, function(f) {
			return insertNewBuffer(f);
		});
		
		switchBuffer(_.take(newBuffers));
		
		recentFiles.push(_.flatten(files));
		appendRecentFilesToDOM(recentFiles);
	};

	var openFileDialog = function() {		
		dialog.showOpenDialog({ properties: [ 'openFile', 'multiSelections' ]}, function(f) {
			if(f !== undefined) {
				open(f);
			}
		});
	};
	
	var save = function() {
		writeFileSync(currentBuffer.filePath, currentBuffer.text);
		setEditorTitle();
		fillBufferListWithNames();
	};

	var fileSaveAsDialogChangeEvent = function(result) {
		if (result !== undefined) {
			currentBuffer.fileName = path.basename(result);
			currentBuffer.filePath = result;
			save();
			switchBuffer(currentBuffer);
		}
	};
	
	var saveOrSaveAsFile = function() {	
		if(currentBuffer !== undefined && currentBuffer.filePath !== "" && currentBuffer.filePath !== undefined) {
			save();
		} else {
			dialog.showSaveDialog({}, function(f) {
				fileSaveAsDialogChangeEvent(f);
			});
		}
	};
	
	var cycleBuffer = function() {
		if(editorState.length > 1) {
			var currIndex = _.findIndex(editorState, { fileName: currentBuffer.fileName });
			var firstPart = _.first(editorState, currIndex);
			var lastPart = _.rest(editorState, currIndex);
			var newBufferOrder = _.flatten([lastPart, firstPart]);

			switchBuffer(newBufferOrder[1]);
		}
	};

	var cycleEditorThemes = function() {
		if(aceThemes.length > 1) {
			var currTheme = $themeSwitcher.val();
			var currIndex = _.findIndex(aceThemes, function(t) {
				return t == currTheme;
			});

			var firstPart = _.first(aceThemes, currIndex);
			var lastPart = _.rest(aceThemes, currIndex);
			var newThemeOrder = _.flatten([lastPart, firstPart]);
			
			$themeSwitcher.val(newThemeOrder[1]);
			$themeSwitcher.trigger("change");
		}
	};
					
	var closeBuffer = function() {
		if(editorState.length !== 0) {
			if(confirm(warningCloseBuffer)) {
				var newState = _.filter(editorState, function(f) {
					if(f.fileName !== currentBuffer.fileName) {
						return f;
					}					
				});
				editorState = newState;
				
				if (editorState.length > 0) {
					fillBufferListWithNames();
					switchBuffer(_.last(editorState));
				} else {
					editorState = [];
					switchBuffer(insertNewBuffer());
				}
			}
		}
	};

	var closeAllBuffers = function() {
		if (confirm(warningCloseAllBuffers)) {
			editorState = [];
			fillBufferListWithNames();
			switchBuffer(insertNewBuffer());
		}
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
		}
		function keyBindWithCtrlAlt(k, fun) {
			if(e.ctrlKey && e.altKey && k === e.keyCode){
				fun();
				e.preventDefault();
			}
		}
		function keyBindWithAlt(k, fun) {
			if(e.altKey && !e.ctrlKey && k === e.keyCode){
				fun();
				e.preventDefault();
			}
		}
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
		keyBind(keyCodes.f1, function() {
			togglePage($start, function() { 				
				setEditorTitle("Start");
			});
		});
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
		
		return false;
	};
				
	var bufferSwitcherChangeEvent = function(fileName) {		
		var buffer = _.find(editorState, function(f) {
			if(f.fileName === fileName) {
				return f;
			}
		});
		
		switchBuffer(buffer);
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
		bindElementEvent($bufferSwitcher, "change", function(b) {
			bufferSwitcherChangeEvent(b.value);
			togglePage($editor, function() { 
				setEditorTitle();
			});
		});
		bindElementEvent($themeSwitcher, "change", function(t) {
			setEditorTheme(editor, t.value);
			displayNotification(_s.sprintf("Theme: %s", t.value));
			writeConfig();
		});
		bindElementEvent($languageModeSwitcher, "change", function(l) {
			setEditorHighlightingMode(editor.getSession(), l.value);
		});
		bindElementEvent($fontSizeSwitcher, "change", function(f) {			
			editor.setFontSize(f.value);
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
				editor.setPrintMarginColumn(80);
			} else {			
				editor.setPrintMarginColumn(-1);
			}
		});
		bindElementEvent($lineEndingsSwitcher, "change", function(e) {			
			editor.getSession().setNewLineMode(e.value);
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
		bindElementEvent($openFiles, "click", function() {
			openFileDialog();
		});
	};
	
	var documentOndrop = function(e) {
		var files = _.pluck(e.dataTransfer.files, function(f) {
			return f.path;
		});
		e.preventDefault();
		open(files);
	};
		
	// ---- init ----------------------------------------------------------- //
	
	var aceThemes = getResourceList(aceResourcePath, "theme");

	$(document).ready(function() {		
		$controlPanelInfo.append("<br/>");
		$controlPanelInfo.append("NodeJS: " + remote.process.version);
		$controlPanelInfo.append(", Atom-Shell: " + remote.process.versions['atom-shell']);
	
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
		};
		window.ondragover = function(e) { e.preventDefault(); };
		window.ondrop = function(e) { e.preventDefault(); };
		document.ondrop = function(e) { documentOndrop(e); };
		document.onkeydown = function(e) { documentOnkeydown(e); };
		document.onkeyup = function(e) { lastKeyCode = null; };
		$about.html(markdown(fs.readFileSync(aboutFilePath).toString()));
		showGutter(editor, false);
		setEditorTheme(editor, "chaos");
		loadAndEnableEditorSnippets(editor, ace.config);
		fillSelectWithOptions($themeSwitcher, aceThemes);
		fillSelectWithOptions($languageModeSwitcher, getResourceList(aceResourcePath, "mode"));
		fillSelectWithOptions($fontSizeSwitcher, fontSizes);
		window.onunload = function(e) {
			writeConfig();
			writeRecentFiles();
		};
		readConfigFile(configFilePath, function(o) {
			setEditorPropsFromConfig(JSON.parse(o));
		});
		readConfigFile(recentFilesPath, function(o) {
			setRecentFilesFromConfig(o);
		});	
		bindEvents();
		insertNewBufferAndSwitch();
	});
	
	return my;
}(App));