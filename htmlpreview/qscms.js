function previewHtml(input) {
	$('#preview').html('Edit');
	$('#qscms-input').hide();
	activePreview = true;
	
	var document = qscms(input);
	
	$('title').html(document[2] + ' - Smogon HTML Previewer');
	$('.qscms-title').html(document[2]);
	$('#qscms-content').html(document[1]);
	$('#qscms-content').show();
	$(document[0]).insertAfter('#head-marker');
}

function resetHtml() {
	$('#preview').html('Preview');
	$('#qscms-input').show();
	activePreview = false;
	
	$('title').html('Editing HTML - Smogon HTML Previewer');
	$('.qscms-title').html('Smogon HTML Previewer');
	$('#qscms-content').hide();
	$('#head-marker').nextAll().remove();
}

function qscms(input) {
	var self = this;
	var document = [];
	
	self.Key = function(key) {
		var escapedCharacters = '[]\\^$.|?*+()'.split('');
		var oKey = key;
		this.Key = function() {
			return oKey
		};
		this.RegEx = (key.hasOwnProperty('source') ? function() {
			return oKey
		} : function() {
			var escaped = '';
			for (var i = 0; i < oKey.length; i++) {
				if ($.inArray(oKey.charAt(i), escapedCharacters) > -1) {
					escaped += '\\' + oKey.charAt(i)
				} else {
					escaped += oKey.charAt(i)
				}
			}
			return new RegExp(escaped, 'gi')
		})
	}
	
	self.Function = function(func, obj, args) {
		this.Get = function() {
			return func.apply(obj, args)
		}
	};
	
	self.Parser = new(function(scms) {
		var self = this;
		var cms = scms;
		var source = input;
		self.Settings = {
			documentSections: {
				title: new cms.Key('[title]'),
				head: new cms.Key('[head]'),
				page: new cms.Key('[page]')
			}
		};
		self.GetDocumentSection = function(key) {
			var sections = self.Settings.documentSections;
			var sectionText = source.substring(source.search(key.RegEx()) + key.Key().length);
			var endIndex = Infinity;
			var itemIndex = 0;
			for (var section in sections) {
				itemIndex = sectionText.search(sections[section].RegEx());
				if (itemIndex >= 0 && itemIndex < endIndex) {
					endIndex = itemIndex
				}
			}
			if (endIndex === Infinity) {
				endIndex = sectionText.length
			}
			return sectionText.substring(0, endIndex)
		};
	})(self);
	
	self.DisplayAdapter = new(function(scms) {
		var self = this;
		var cms = scms;
		var head = '';
		var body = '';
		self.TemplateKey = function(key, replacement) {
			cms.Key.call(this, key);
			var oRep = replacement;
			this.Replacement = (typeof(oRep) === 'object' ? oRep.Get : function() {
				return oRep
			})
		};
		self.PathRouter = function(key, replacement, priority) {
			self.TemplateKey.call(this, key, replacement);
			this.Priority = priority
		};
		self.Settings = {
			templateKeys: [new self.TemplateKey('{head}', new cms.Function(cms.Parser.GetDocumentSection, self, [cms.Parser.Settings.documentSections.head])), new self.TemplateKey('{page}', new cms.Function(cms.Parser.GetDocumentSection, self, [cms.Parser.Settings.documentSections.page])), new self.TemplateKey('{title}', new cms.Function(cms.Parser.GetDocumentSection, self, [cms.Parser.Settings.documentSections.title]))],
			pathKeys: [new self.PathRouter('src="/', 'src="http://www.smogon.com/', 0), new self.PathRouter('href="/', 'href="http://www.smogon.com/', 0), new self.PathRouter(new RegExp('src="/media/upload/smog/issue[0-9]{1,3}/', 'gi'), 'src="images/', 2)]
		};
		
		self.GenerateDocument = function() {
            var keys = self.Settings.templateKeys;
            for (var i = 0; i < keys.length; i++) {
                document.push(FixPaths(keys[i].Replacement()));
            }
		}

		function FixPaths(source) {
			var rules = [];
			for (var i = 0; i < self.Settings.pathKeys.length; i++) {
				rules.push(jQuery.extend(true, {}, self.Settings.pathKeys[i]))
			}
			var next = 0;
			while (rules.length > 1) {
				for (var i = 0; i < rules.length; i++) {
					if (rules[i].Priority > rules[next].Priority) {
						next = i
					}
				}
				source = source.replace(rules[next].RegEx(), rules[next].Replacement());
				rules.splice(next, 1);
				next = 0
			}
			if (rules.length === 1) {
				source = source.replace(rules[0].RegEx(), rules[0].Replacement())
			}
			return source
		}
	})(self);
	
	self.DisplayAdapter.GenerateDocument();
	return document;
}