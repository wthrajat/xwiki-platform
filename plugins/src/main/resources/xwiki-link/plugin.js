/*
 * See the NOTICE file distributed with this work for additional
 * information regarding copyright ownership.
 *
 * This is free software; you can redistribute it and/or modify it
 * under the terms of the GNU Lesser General Public License as
 * published by the Free Software Foundation; either version 2.1 of
 * the License, or (at your option) any later version.
 *
 * This software is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public
 * License along with this software; if not, write to the Free
 * Software Foundation, Inc., 51 Franklin St, Fifth Floor, Boston, MA
 * 02110-1301 USA, or see the FSF site: http://www.fsf.org.
 */
(function (){
  'use strict';
  var wikiLinkClassPattern =  /\bwiki(\w*)link\b/i;
  var resourceTypeToLinkType = {
    attach: 'attachment',
    mailto: 'external',
    unc: 'external',
    url: 'external'
  };

  CKEDITOR.plugins.add('xwiki-link', {
    requires: 'xwiki-marker,xwiki-resource',

    init: function(editor) {
      editor.plugins['xwiki-marker'].addMarkerHandler(editor, 'wikilink', {
        // startLinkComment: CKEDITOR.htmlParser.comment
        // content: CKEDITOR.htmlParser.node[]
        toHtml: function(startLinkComment, content) {
          if (content.length === 1 && content[0].type === CKEDITOR.NODE_ELEMENT && content[0].children.length === 1 &&
              content[0].children[0].name === 'a') {
            // Remove the link wrapper while editing, but keep the link type in order to preserve the link styles.
            var linkWrapper = content[0];
            var link = linkWrapper.children[0];
            linkWrapper.replaceWithChildren();
            // We store the link type in a data attribute because we don't want the user to see it in the link dialog.
            var linkType = (wikiLinkClassPattern.exec(linkWrapper.attributes['class']) || ['', ''])[1];
            link.attributes['data-linktype'] = linkType;
            // Store the link reference.
            var reference = startLinkComment.value.substring('startwikilink:'.length);
            link.attributes['data-reference'] = CKEDITOR.tools.unescapeComment(reference);
            // Handle the auto-generated link content.
            if (link.children.length === 1 && link.children[0].type === CKEDITOR.NODE_ELEMENT &&
                link.children[0].hasClass('wikigeneratedlinkcontent')) {
              // Store the initial (generated) link content in order to be able to detect changes.
              link.attributes['data-wikigeneratedlinkcontent'] = link.children[0].getHtml();
              link.children[0].replaceWithChildren();
            }
            // Handle free-standing links.
            if (link.hasClass('wikimodel-freestanding')) {
              link.attributes['data-freestanding'] = true;
              // This is an internal class that should not be visible when editing the link.
              link.removeClass('wikimodel-freestanding');
            }
          } else {
            // Unexpected HTML structure inside link markers. Keep the markers.
            return false;
          }
        },
        // element: CKEDITOR.htmlParser.element
        isMarked: function(element) {
          return element.name === 'a' && element.attributes['data-reference'];
        },
        // link: CKEDITOR.htmlParser.element
        toDataFormat: function(link) {
          // Add the start/stop link markers.
          var reference = CKEDITOR.tools.escapeComment(link.attributes['data-reference']);
          var startLinkComment = new CKEDITOR.htmlParser.comment('startwikilink:' + reference);
          var stopLinkComment = new CKEDITOR.htmlParser.comment('stopwikilink');
          startLinkComment.insertBefore(link);
          stopLinkComment.insertAfter(link);
          delete link.attributes['data-reference'];
          // Wrap the link.
          link.wrapWith(new CKEDITOR.htmlParser.element('span', {
            'class': 'wiki' + (link.attributes['data-linktype'] || '') + 'link'
          }));
          delete link.attributes['data-linktype'];
          // Handle the auto-generated link content.
          if (link.attributes['data-wikigeneratedlinkcontent'] === link.getHtml()) {
            // The link content was generated and hasn't been modified. Wrap the link content.
            link.add(new CKEDITOR.htmlParser.element('span', {'class': 'wikigeneratedlinkcontent'}), 0);
            var linkContent = link.children[0];
            while (link.children.length > 1) {
              var child = link.children[1];
              child.remove();
              linkContent.add(child);
            }
            // Only the links with auto-generated content can be free-standing.
            if (link.attributes['data-freestanding'] === 'true') {
              link.addClass('wikimodel-freestanding');
            }
          }
          delete link.attributes['data-wikigeneratedlinkcontent'];
          delete link.attributes['data-freestanding'];
        }
      });
    },

    onLoad: function() {
      overrideLinkPlugin();
    }
  });

  var overrideLinkPlugin = function() {
    var linkPlugin = CKEDITOR.plugins.link;
    if (!linkPlugin) {
      return;
    }
    if (typeof linkPlugin.parseLinkAttributes === 'function') {
      var oldParseLinkAttributes = linkPlugin.parseLinkAttributes;
      linkPlugin.parseLinkAttributes = function(editor, element) {
        var data = oldParseLinkAttributes.call(linkPlugin, editor, element);
        var serializedResourceReference = element && element.getAttribute('data-reference');
        if (serializedResourceReference) {
          data.resourceReference = CKEDITOR.plugins.xwikiResource
            .parseResourceReference(serializedResourceReference);
        }
        return data;
      };
    }
    if (typeof linkPlugin.getLinkAttributes === 'function') {
      var oldGetLinkAttributes = linkPlugin.getLinkAttributes;
      linkPlugin.getLinkAttributes = function(editor, data) {
        var attributes = oldGetLinkAttributes.call(linkPlugin, editor, data);
        var resourceReference = data.resourceReference;
        if (resourceReference) {
          attributes.set['data-reference'] = CKEDITOR.plugins.xwikiResource
            .serializeResourceReference(resourceReference);
          attributes.set['data-linktype'] = resourceTypeToLinkType[resourceReference.type] || '';
        }
        return attributes;
      };
    }
  };

  CKEDITOR.on('dialogDefinition', function(event) {
    // Make sure we affect only the editors that load this plugin.
    if (!event.editor.plugins['xwiki-link']) {
      return;
    }

    // Take the dialog window name and its definition from the event data.
    var dialogName = event.data.name;
    var dialogDefinition = event.data.definition;
    if (dialogName === 'link') {
      var resourcePicker = createResourcePicker(event.editor);
      replaceLinkTypeSelect(dialogDefinition, resourcePicker);

      // Bind the value of the email address and url fields to the resource reference field.
      // Hide the email address, url and protocol fields because we're using the resource picker instead.
      var infoTab = dialogDefinition.getContents('info');
      var resourcePlugin = CKEDITOR.plugins.xwikiResource;
      resourcePlugin.bindResourcePicker(infoTab.get('emailAddress'), ['info', resourcePicker.id], true);
      var urlField = infoTab.get('url');
      resourcePlugin.bindResourcePicker(urlField, ['info', resourcePicker.id]);
      infoTab.get('protocol').hidden = true;

      // Add page link options.
      infoTab.add({
        type: 'vbox',
        id: 'docOptions',
        children: [
          createQueryStringField({id: 'docQueryString'}, 'doc'),
          createAnchorField({id: 'docAnchor'}, 'doc')
        ]
      });

      // Add attachment link options.
      infoTab.add({
        type: 'vbox',
        id: 'attachOptions',
        children: [
          createQueryStringField({id: 'attachQueryString'}, 'attach')
        ]
      });

      // Bind the mail link options to the corresponding resource reference parameters.
      bindToResourceParameter(infoTab.get('emailSubject'), 'subject', 'mailto');
      bindToResourceParameter(infoTab.get('emailBody'), 'body', 'mailto');

      // Remove the custom focus handler set by the link dialog because we want the first input (which is the resource
      // picker) to be focused when the dialog is opened.
      delete dialogDefinition.onFocus;

      // The link dialog doesn't have a field to input or edit the link label (because the link label can be edited
      // in-line) and it uses the link URL as the default label when there is no text or element (e.g. image) selected
      // in the edited content. This is fine for the external (URL) links but for internal links it's nicer to use the
      // resource label (e.g. the wiki page title or the attachment file name).
      overwriteDefaultLinkLabel(dialogDefinition);

      resourcePlugin.updateResourcePickerOnFileBrowserSelect(dialogDefinition,
        ['info', resourcePicker.id], ['upload', 'uploadButton']);
    }
  });

  var replaceLinkTypeSelect = function(dialogDefinition, newElementDefinition) {
    var linkTypeDefinition = dialogDefinition.getContents('info').get('linkType');
    // The resource picker takes care of setting the link type value when the resource type changes.
    delete linkTypeDefinition.setup;
    CKEDITOR.plugins.xwikiDialog.replaceWith(dialogDefinition, 'linkType', {
      type: 'vbox',
      children: [newElementDefinition, linkTypeDefinition],
      onLoad: function() {
        this.getDialog().getContentElement('info', 'linkType').getElement().getParent().hide();
      }
    });
  };

  var createResourcePicker = function(editor) {
    return CKEDITOR.plugins.xwikiResource.createResourcePicker({
      resourceTypes: (editor.config['xwiki-link'] || {}).resourceTypes || ['doc', 'attach', 'url', 'mailto'],
      getValue: function() {
        var data = {resourceReference: this.base.getValue.apply(this, arguments)};
        // Collect the resource reference parameters.
        this.getDialog().foreach(function(field) {
          if (field.resourceReferenceParameter === true && typeof field.commit === 'function') {
            field.commit(data);
          }
        });
        return data.resourceReference;
      },
      setup: function(data) {
        this.setValue(data.resourceReference);
      },
      commit: function(data) {
        data.resourceReference = this.getValue();
        data.resourceReference.typed = data.resourceReference.type !== 'doc' &&
          (data.resourceReference.type !== 'url' || data.resourceReference.reference.indexOf('://') < 0);
      },
      onResourceTypeChange: function(event, data) {
        var dialog = this.getDialog();
        // Update the value of the link type select because it is used internally by the link dialog. By default there
        // are three link types available: url, anchor and email. We use only url and email because anchor has been
        // merged with url (url links have the option to specify an anchor).
        dialog.setValueOf('info', 'linkType', data.newValue === 'mailto' ? 'email' : 'url');
        // Show the upload tab only for attachment resources.
        if (data.newValue !== 'attach') {
          dialog.hidePage('upload');
        }
        // Show the corresponding options (and hide the rest).
        this.resourceTypes.forEach(function(resourceType) {
          // We reuse the existing email options.
          var optionsId = (resourceType === 'mailto' ? 'email' : resourceType) + 'Options';
          var options = dialog.getContentElement('info', optionsId);
          if (options) {
            var container = options.getElement().getParent().getParent();
            if (resourceType === data.newValue) {
              container.show();
            } else {
              container.hide();
            }
          }
        });
        dialog.layout();
      }
    });
  };

  var createAnchorField = function(definition, resourceType) {
    return createReferenceParameterField('anchor', CKEDITOR.tools.extend(definition || {}, {
      label: 'Anchor'
    }), resourceType);
  };

  var createQueryStringField = function(definition, resourceType) {
    return createReferenceParameterField('queryString', CKEDITOR.tools.extend(definition || {}, {
      label: 'Query String'
    }), resourceType);
  };

  var createReferenceParameterField = function(parameterName, definition, resourceType) {
    return CKEDITOR.tools.extend(definition || {}, {
      type: 'text',
      resourceReferenceParameter: true,
      setup: setupFromResourceParameter(parameterName, resourceType),
      commit: commitToResourceParameter(parameterName, resourceType)
    });
  };

  var setupFromResourceParameter = function(parameterName, resourceType, oldSetup) {
    return function(data) {
      if (typeof oldSetup === 'function') {
        oldSetup.apply(this, arguments);
      }
      var resourceReference = data.resourceReference || {};
      if (!resourceType || resourceType === resourceReference.type) {
        var referenceParameters = resourceReference.parameters || {};
        this.setValue(referenceParameters[parameterName] || '');
      }
    };
  };

  var commitToResourceParameter = function(parameterName, resourceType, oldCommit) {
    return function(data) {
      var value = this.getValue().trim();
      if (value !== '' && (!resourceType || resourceType === data.resourceReference.type)) {
        data.resourceReference.parameters = data.resourceReference.parameters || {};
        data.resourceReference.parameters[parameterName] = value;
      }
      if (typeof oldCommit === 'function') {
        oldCommit.apply(this, arguments);
      }
    };
  };

  var bindToResourceParameter = function(definition, parameterName, resourceType) {
    definition.resourceReferenceParameter = true;
    definition.setup = setupFromResourceParameter(parameterName, resourceType, definition.setup);
    definition.commit = commitToResourceParameter(parameterName, resourceType, definition.commit);
  };

  /**
   * Use the resource label as the default link label when creating a new link and there is no text or element (e.g.
   * image) selected in the edited content.
   */
  var overwriteDefaultLinkLabel = function(dialogDefinition) {
    var oldOnOk = dialogDefinition.onOk;
    dialogDefinition.onOk = function() {
      if (!this._.selectedElement) {
        // When creating a new link..
        var editor = this.getParentEditor();
        var range = editor.getSelection().getRanges()[0];
        if (range.collapsed) {
          // And there's no text or element (e.g. image) selected in the edited content..
          var resourceReference = this.getValueOf('info', 'resourceReference');
          var resourceLabel = CKEDITOR.plugins.xwikiResource.getResourceLabel(resourceReference);
          var textNode = new CKEDITOR.dom.text(resourceLabel, editor.document);
          range.insertNode(textNode);
          range.selectNodeContents(textNode);
          range.select();
        }
      }
      if (oldOnOk) {
        oldOnOk.apply(this, arguments);
      }
    };
  };
})();
