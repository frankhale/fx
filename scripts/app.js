var App = (function (my) {
	var my = {};
	
	var fs = require('fs');
	var remote = require('remote');
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
	
	var pages = [$editor, $controlPanel, $about, $help];
	
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
	}
	
	var editorState = [];
	var currentBuffer = [];
	
	var front = document.getElementById('editor'),
		back;
	var flipped = false;
	
    editor.setTheme("ace/theme/dawn");
    editor.getSession().setMode("ace/mode/javascript");	
	
	document.onkeydown = function(e) {
		if(e.ctrlKey /*&& e.altKey*/) {
			switch(e.keyCode) {
				case 88: // x
					my.reloadApp();
				break;
				case 77: // m
					my.toggleDevTools();
				break;
				case 66: // b
					if(!flipped) {
						var back_content = document.getElementById('control-panel').innerHTML;
						back = flippant.flip(front, back_content, 'modal');
						flipped = true;
					} else {
						back.close();
						flipped = false;
					}
				break;
			}
		}
		return e;
	};

	// ---- private functions ---------------------------------------------- //
	
	var openAboutFile = function() {
		return fs.readFileSync(aboutFilePath).toString();
	};
	
	var readFileSync = function(file) {
		return fs.readFileSync(file.path).toString();
	};
	
	var writeFileSync = function(filePath, content) {
		fs.writeFileSync(filePath, content);
	};
	
	var watchWindowCloseEvent = function(func) {
		// The window in this context should be the Atom-Shell browser window
		// and it's close method, however that is called. Need to research it.
		
		//window.on("close", function() {
		//	func();
		//	window.close(true);
		//});
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
		editor.setOptions({enableBasicAutocompletion: true, enableSnippets: true});
	};

	var setEditorHighlightingMode = function(session, mode, func) {
		if(mode) {
			session.setMode("ace/mode/" + mode);
			session.setMode();
		}
		if(func) {
			func(mode);
		}
	};
	
	function setEditorHighlightingMode(session, mode) {
		setEditorHighlightingMode(session, mode, null);
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
			
			setEditorHighlightingMode(session, null, null);
		}
	};
	
	var clearEditor = function(editor) {
		editor.setValue("");
	};
	
	var showInvisibleChars = function(editor, result) {
		if(result) {
			editor.setShowInvisibles(true);
			editor.setShowInvisibles(false);
		}
	};
	
	var showIndentGuides = function(editor, result) {
		if(result) {
			editor.setDisplayIndentGuides(true);
			editor.setDisplayIndentGuides(false);
		}
	};		

	var showGutter = function(editor, result) {
		if(result) {
			editor.renderer.setShowGutter(true);
			editor.renderer.setShowGutter(false);
		}
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
		//console.log(items);
		return _.map(items, function(i) {
			createOption(elem, i);
		});
	};
	
	var bindElementEvent = function(elem, event, callback) {
		elem.bind(event, function(e) {
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
		if (title !== currentBuffer.fileName) {
			document.title = sprintf.sprintf("%s - [ %s ]", editorName, title);
		} else {
			document.title = sprintf.sprintf("%s - [%s] (Lines: %d)", editorName, title, editor.getSession().getLength());
		}
	};

	function setEditorTitle() {
		setEditorTitle(currentBuffer.fileName);
	};
	
	var switchBuffer = function(buffer) {
		currentBuffer = buffer;
		editor.setSession(buffer.session);
		buffer.session.setUndoManager(buffer.undoManager);
		setEditorTitle(buffer.fileName);
		$bufferSwitcher.val(currentBuffer.fileName);

		if(buffer.filepath !== "") {
			setHighlighting(buffer.session, path.extname(buffer.filePath), function(m) {
				$languageModeSwitcher.val(m);
			});
		}
	};
	
	var insertNewBuffer = function(file) {
		var newBuffer = {};
		
		if(file !== null && file !== undefined) {
			var text = readFileSync(file);
			
			newBuffer = {fileName: file.name,
						 filePath: file.path,
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
				setEditorTitle();
			}
		}, newBuffer);
		
		return newBuffer;
	};

	function insertNewBuffer() {
		insertNewBuffer(null);
	};

	var insertNewBufferAndSwitch = function() {
		switchBuffer(insertNewBuffer());
	};

	var rerenderEditor = function() {
		editor.renderer.updateFull();
	};
	
	//(defn toggle-page [elem & {:keys [func] :or {func nil}}]
	//	(doall (map #(jq/fade-out % "fast") pages))
	//	(if (.is elem ":visible")
	//		(do
	//			(jq/fade-in $editor "fast")
	//			(rerender-editor)
	//			(set-editor-title))
	//		(do			
	//			(jq/fade-in elem "fast")
	//			(when func
	//				(func)))))
	
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
		var newBuffers = _.map(files, function(f) {
			insertNewBuffer(f);
		});
		
		switchBuffer(_.take(newBuffers, 1));
	};
	
	var openFileDialog = function() {
		//(jq/trigger $file-open-dialog "click"))
	};

	var fileOpenDialogChangeEvent = function(result) {
		open(result.files);
	};
			
	var save = function() {
		writeFileSync(currentBuffer.file-path, currentBuffer.text);
		setEditorTitle();
	};

	var saveOrSaveAsFile = function() {
		//	(if (not (empty? (:file-path @current-buffer)))
		//		(save)
		//		(jq/trigger $file-save-as-dialog "click")))
	};
		
	var fileSaveAsDialogChangeEvent = function(result) {
		//	(let [files (array-seq (.-files result))
		//		  file (first files)]
		//		(swap! current-buffer conj {:file-path (.-path file) 
		//									:file-name (.-name file)})
		//		;(util/log (str "save-as: " @current-buffer))
		//		;(util/log (str "save-as: " (:file-path @current-buffer)))
		//		(save)
		//		(switch-buffer @current-buffer)))
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

	var closeAllBuffers = new function() {
		//	(when (js/confirm warning-close-all-buffers)
		//		(reset! editor-state [])
		//		(fill-buffer-list-with-names) 
		//		(switch-buffer (insert-new-buffer))))
	};

	var editorStateWithoutNewEmptyFiles = function() {
		//	; Need to filter the editor-state such that all files starting with 
		//	; new-buffer-name and having a no text are eliminated and the new state is returned
		//	(let [new-state (filter #(if-not (and (util/starts-with (:file-name %) new-buffer-name) (empty? (:text %))) %) @editor-state)]
		//	;(util/log (str new-state))
		//	new-state))
	};

	var documentOnkeydown = function(e) {
		//	"Handles all of the custom key combos for the editor. All combos start with CTRL and then the key."
		//	;(util/log (str "Keycode: " (.-keyCode e)))
		//	(let [key-bind-with-ctrl (fn [k fun] (when (and (.-ctrlKey e) (not (.-altKey e)) (= (.-keyCode e) (k key-codes)) (do (fun) (jq/prevent e)))))
		//		  key-bind-with-ctrl-alt (fn [k fun] (when (and (.-ctrlKey e) (.-altKey e) (= (.-keyCode e) (k key-codes)) (do (fun) (jq/prevent e)))))
		//		  key-bind-with-alt (fn [k fun] (when (and (.-altKey e) (= (.-keyCode e) (k key-codes)) (do (fun) (jq/prevent e)))))
		//		  key-bind (fn [k fun] (when (and (not (.-altKey e)) (not (.-ctrlKey e)) (= (.-keyCode e) (k key-codes))) (do (fun) (jq/prevent e))))]
		//		(key-bind-with-ctrl-alt :b util/nw-refresh)
		//		(key-bind-with-ctrl :n insert-new-buffer-and-switch)
		//		(key-bind-with-ctrl :o open-file-dialog)
		//		(key-bind-with-ctrl :s save-or-save-as-file)	
		//		(key-bind-with-ctrl :m close-buffer)
		//		(key-bind-with-ctrl-alt :m close-all-buffers)
		//		(key-bind-with-ctrl :tab cycle-buffer)
		//		(key-bind-with-ctrl :w write-config)
		//		(key-bind :f2 #(toggle-page $control-panel :func (fn [] (set-editor-title "Control Panel"))))		
		//		(key-bind :f3 cycle-editor-themes)
		//		(key-bind :f10 #(toggle-page $help :func (fn [] (set-editor-title "Help"))))
		//		(key-bind :f11 #(toggle-page $about :func (fn [] (set-editor-title "About"))))
		//		(key-bind :f12 util/show-nw-dev-tools)	
		//		e))
	};
				
	var bufferSwitcherChangeEvent = function(fileName) {
		//	(let [buffer (first (util/find-map @editor-state :file-name file-name))]
		//		(switch-buffer buffer)))
	};

	var displayNotification = function(msg) {
		//	(jq/html $notification msg)	
		//	(jq/fade-in $notification "slow" 
		//		(fn [] (.setTimeout js/window
		//			#(jq/fade-out $notification "slow") notification-fade-out-speed))))
	};
		
	var bindEvents = function() {
		//	(util/bind-element-event $file-open-dialog :change #(file-open-dialog-change-event %))
		//	(util/bind-element-event $file-save-as-dialog :change #(file-save-as-dialog-change-event %))
		//	(util/bind-element-event $buffer-switcher :change #(do (buffer-switcher-change-event (.-value %)) (toggle-page $control-panel :func (fn [] (set-editor-title "Control Panel")))))
		//	(util/bind-element-event $theme-switcher :change #(do (frehley/set-editor-theme editor (.-value %)) (display-notification (str "Theme: " (.-value %))) (write-config)))
		//	(util/bind-element-event $language-mode-switcher :change #(do (frehley/set-editor-highlighting-mode (.getSession editor) (.-value %))))
		//	(util/bind-element-event $font-size-switcher :change #(do (frehley/set-editor-font-size editor (.-value %)) (write-config)))
		//	(util/bind-element-event $show-invisible-chars :click #(frehley/show-invisible-chars editor (.-checked %)))
		//	(util/bind-element-event $show-indent-guides :click #(frehley/show-indent-guides editor (.-checked %)))
		//	(util/bind-element-event $show-gutter :click #(frehley/show-gutter editor (.-checked %)))
		//	(util/bind-element-event $line-wrap :click #(frehley/set-line-wrap editor 80))
		//	(util/bind-element-event $print-margin :click #((if (.-checked %) 
		//		(frehley/set-print-margin editor 80) (frehley/set-print-margin editor -1))))
		//	(util/bind-element-event $line-endings-switcher :change #(frehley/set-line-endings-mode editor (.-value %))))
	};
	
	var documentOndrop = function(e) {
		var files = e.dataTransfer.files;
		e.preventDefault();
		editorState = editorStateWithoutNewEmptyFiles();
		open(files);
	}
		
	// ---- init ----------------------------------------------------------- //
	
	var aceThemes = getResourceList(aceResourcePath, "theme");

	$(document).ready(function() {
		var controlPanelInfo = $("#control-panel-info");
		controlPanelInfo.append("<br/>");
		controlPanelInfo.append("NodeJS: " + remote.process.version);
		controlPanelInfo.append(", Atom-Shell: " + remote.process.versions['atom-shell']);
	
		//	; The following hackery is to get around the key stealing by Ace. I wanted to use
		//	; the F2 key and apparently Ace is stilling the events on that key. This clears it up!
		//	;
		//	; Got the idea from here: http://japhr.blogspot.com/2013/03/ace-events-removing-and-handling.html
		//	;
		//	(set! (.-origOnCommandKey (.-keyBinding editor)) (.-onCommandKey (.-keyBinding editor)))
		//	(set! (.-onCommandKey (.-keyBinding editor)) (fn [e h k] 
		//															(do
		//																(let [key-code (.-keyCode e)]
		//																	; it is what it is, don't laugh!
		//																	(when (= key-code 113)
		//																		(document-onkeydown e))
		//																	(this-as x (.origOnCommandKey x e h k))))))
		window.ondragover = function(e) { e.preventDefault(); }
		window.ondrop = function(e) { e.preventDefault(); }
		document.ondrop = function(e) { documentOndrop(e); }
		//document.onkeydown = function(e) { documentOnkeydown(e); }
		$about.html(markdown(openAboutFile()));
		showGutter(editor, false);
		setEditorTheme(editor, "chaos");
		loadAndEnableEditorSnippets(editor, ace.config);
		fillSelectWithOptions($themeSwitcher, aceThemes);
		fillSelectWithOptions($languageModeSwitcher, getResourceList(aceResourcePath, "mode"));
		fillSelectWithOptions($fontSizeSwitcher, fontSizes);
		watchWindowCloseEvent(function() { writeConfig(); });
		readConfig(function(o) {
			setEditorPropsFromConfig(JSON.parse(o));
		});
		bindEvents();
		insertNewBufferAndSwitch();
	});
	
	
	// -----public functions ----------------------------------------------- //
	
	//my.showControlPanel = function() {
	//	back = flippant.flip(front, back_content, 'modal');
	//};
	
	my.closeControlPanel = function() {
		back.close();
	};
	
	my.reloadApp = function () {
		browser.reload();
	};

	my.toggleDevTools = function () {
		browser.toggleDevTools();
	};

	return my;
}(App));