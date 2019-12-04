var debounce = require('./debounce');

module.exports = function (params, cy, api) {
  var elementUtilities;
  var fn = params;

  var hoveredGroup, preventDrawing = false;
  let selectedGroups = [];

  const getData = function(){
    var scratch = cy.scratch('_cyExpandCollapse');
    return scratch && scratch.cueUtilities;
  };

  const setData = function( data ){
    var scratch = cy.scratch('_cyExpandCollapse');
    if (scratch == null) {
      scratch = {};
    }

    scratch.cueUtilities = data;
    cy.scratch('_cyExpandCollapse', scratch);
  };

  var functions = {
    init: function () {
      var self = this;
      var $canvas = document.createElement('canvas');
      $canvas.classList.add("expand-collapse-canvas");
      var $container = cy.container();
      var ctx = $canvas.getContext( '2d' );
      $container.append($canvas);

      elementUtilities = require('./elementUtilities')(cy);

      var offset = function(elt) {
          var rect = elt.getBoundingClientRect();

          return {
            top: rect.top + document.documentElement.scrollTop,
            left: rect.left + document.documentElement.scrollLeft
          }
      }

      var _sizeCanvas = debounce(function () {
        $canvas.height = cy.container().offsetHeight;
        $canvas.width = cy.container().offsetWidth;
        $canvas.style.position = 'absolute';
        $canvas.style.top = 0;
        $canvas.style.left = 0;
        $canvas.style.zIndex = options().zIndex;

        setTimeout(function () {
          var canvasBb = offset($canvas);
          var containerBb = offset($container);
          $canvas.style.top = -(canvasBb.top - containerBb.top);
          $canvas.style.left = -(canvasBb.left - containerBb.left);

          // refresh the cues on canvas resize
          if(cy){
            clearDraws(true);
          }
        }, 0);

      }, 250);

      function sizeCanvas() {
        _sizeCanvas();
      }

      sizeCanvas();

      var data = {};

      // if there are events field in data unbind them here
      // to prevent binding the same event multiple times
      // if (!data.hasEventFields) {
      //   functions['unbind'].apply( $container );
      // }
      window.addEventListener('resize', data.eWindowResize = function () {
        sizeCanvas();
      });

      function options() {
        return cy.scratch('_cyExpandCollapse').options;
      }

      function clearDraws() {
        var w = cy.width();
        var h = cy.height();

        ctx.clearRect(0, 0, w, h);
      }

      function isSelectedGroupsContains(group) {
        return selectedGroups.find(node => node.id() === group.id()) !== undefined;
      }

      function isAnyGroupWithCue() {
        return hoveredGroup || selectedGroups.length > 0;
      }

      function drawCuesForSelectedGroups() {
        selectedGroups.forEach(group => drawExpandCollapseCue(group))
      }

      function removeGroupFromSelectedGroups(node) {
        selectedGroups = selectedGroups.filter(group => group.id() !== node.id());
      }

      function isMouseHoveringOver(node) {
        return hoveredGroup && hoveredGroup.id() === node.id();
      }

      function isAGroup(node) {
        return api.isCollapsible(node) || api.isExpandable(node);
      }

      function drawExpandCollapseCue(node) {
        // If this is a simple node with no collapsed children return directly
        if (!isAGroup(node)) {
          return;
        }

        var isCollapsed = node.hasClass('cy-expand-collapse-collapsed-node');

        //Draw expand-collapse rectangles
        var rectSize = options().expandCollapseCueSize;
        var lineSize = options().expandCollapseCueLineSize;
        var diff;

        var expandcollapseStartX;
        var expandcollapseStartY;
        var expandcollapseEndX;
        var expandcollapseEndY;
        var expandcollapseRectSize;

        var expandcollapseCenterX;
        var expandcollapseCenterY;
        var cueCenter = {
          x: 0,
          y: 0
        };

        const offset = 1;
        const size = cy.zoom() < 1 ? rectSize / (2*cy.zoom()) : rectSize / 2;
        if (options().expandCollapseCuePosition === 'top-left') {
          cueCenter.x = node.position('x') - node.width() / 2 - parseFloat(node.css('padding-left'))
                  + parseFloat(node.css('border-width')) + size + offset;
          cueCenter.y = node.position('y') - node.height() / 2 - parseFloat(node.css('padding-top'))
                  + parseFloat(node.css('border-width')) + size + offset;
        } else if (options().expandCollapseCuePosition === 'top-right') {
          cueCenter.x = node.position('x') + node.width() / 2 + parseFloat(node.css('padding-left'))
                  - parseFloat(node.css('border-width')) - size - offset;
          cueCenter.y = node.position('y') - node.height() / 2 - parseFloat(node.css('padding-top'))
                  + parseFloat(node.css('border-width')) + size + offset;
        } else if (options().expandCollapseCuePosition === 'top-center') {
          cueCenter.x = node.position('x');
          cueCenter.y = node.position('y') - node.height() / 2 - parseFloat(node.css('padding-top'))
                 + parseFloat(node.css('border-width')) + size + offset;
        } else {
          var option = options().expandCollapseCuePosition;
          cueCenter = typeof option === 'function' ? option.call(this, node) : option;
        }

        var expandcollapseCenter = elementUtilities.convertToRenderedPosition(cueCenter);

        // convert to rendered sizes
        rectSize = Math.max(rectSize, rectSize * cy.zoom());
        lineSize = Math.max(lineSize, lineSize * cy.zoom());
        diff = (rectSize - lineSize) / 2;

        expandcollapseCenterX = expandcollapseCenter.x;
        expandcollapseCenterY = expandcollapseCenter.y;

        expandcollapseStartX = expandcollapseCenterX - rectSize / 2;
        expandcollapseStartY = expandcollapseCenterY - rectSize / 2;
        expandcollapseEndX = expandcollapseStartX + rectSize;
        expandcollapseEndY = expandcollapseStartY + rectSize;
        expandcollapseRectSize = rectSize;

        // Draw expand/collapse cue if specified use an image else render it in the default way
        if (!isCollapsed && options().expandCueImage) {
          ctx.drawImage(options().expandCueImage, expandcollapseStartX, expandcollapseStartY, rectSize, rectSize);
        }
        else if (isCollapsed && options().collapseCueImage) {
          ctx.drawImage(options().collapseCueImage, expandcollapseStartX, expandcollapseStartY, rectSize, rectSize);
        }
        else {
          var oldFillStyle = ctx.fillStyle;
          var oldWidth = ctx.lineWidth;
          var oldStrokeStyle = ctx.strokeStyle;

          ctx.fillStyle = "black";
          ctx.strokeStyle = "black";

          ctx.ellipse(expandcollapseCenterX, expandcollapseCenterY, rectSize / 2, rectSize / 2, 0, 0, 2 * Math.PI);
          ctx.fill();

          ctx.beginPath();

          ctx.strokeStyle = "white";
          ctx.lineWidth = Math.max(2.6, 2.6 * cy.zoom());

          ctx.moveTo(expandcollapseStartX + diff, expandcollapseStartY + rectSize / 2);
          ctx.lineTo(expandcollapseStartX + lineSize + diff, expandcollapseStartY + rectSize / 2);

          if (isCollapsed) {
            ctx.moveTo(expandcollapseStartX + rectSize / 2, expandcollapseStartY + diff);
            ctx.lineTo(expandcollapseStartX + rectSize / 2, expandcollapseStartY + lineSize + diff);
          }

          ctx.closePath();
          ctx.stroke();

          ctx.strokeStyle = oldStrokeStyle;
          ctx.fillStyle = oldFillStyle;
          ctx.lineWidth = oldWidth;
        }

        node._private.data.expandcollapseRenderedStartX = expandcollapseStartX;
        node._private.data.expandcollapseRenderedStartY = expandcollapseStartY;
        node._private.data.expandcollapseRenderedCueSize = expandcollapseRectSize;
      }

      function refreshCanvasImages() {
        clearDraws();
        if (hoveredGroup && !isSelectedGroupsContains(hoveredGroup)){
          drawExpandCollapseCue(hoveredGroup);
        }
        if (options().appearOnGroupSelect) {
          drawCuesForSelectedGroups();
        }
      }

      function hoveringOverDifferentGroup(node) {
        return hoveredGroup.id() !== node.id();
      }

      {
        cy.on('expandcollapse.clearvisualcue', function() {

          if ( hoveredGroup ) {
            clearDraws();
          }
        });

        cy.on('zoom pan', data.eZoom = function (e) {
          if (hoveredGroup || selectedGroups.length > 0) {
            refreshCanvasImages();
          }
        });

        cy.on('mouseout', 'node', data.eMouseOut = function(e) {
          let node = this;
          if (isMouseHoveringOver(node)) {
            // note: hoveredGroup is not set to null if we mouseout from a selected group
            // currently is not a problem as leftover hoveredGroup won't be used and will be reset on mouseover
            if (!isSelectedGroupsContains(hoveredGroup)) {
              hoveredGroup = null;
            }
            refreshCanvasImages();
          }
        });

        cy.on('mouseover', 'node', data.eMouseOver = function (e) {
          let node = this;
          if (isAGroup(node)) {
            hoveredGroup = node;
            refreshCanvasImages();
          }
        });

        cy.on('grab', 'node', data.eGrab = function (e) {
          preventDrawing = true;
        });

        cy.on('free', 'node', data.eFree = function (e) {
          preventDrawing = false;
        });

        cy.on('position', 'node', data.ePosition = function () {
          if (hoveredGroup) {
            refreshCanvasImages();
          }
        });

        var ur;
        cy.on('select', 'node', data.eSelect = function(evt){
          if (this.length > cy.nodes(":selected").length)
            this.unselect();

          if (options().appearOnGroupSelect) {
            let node = this;
            if (isAGroup(node)) {
              if (!isSelectedGroupsContains(node)) {
                selectedGroups.push(node);
              }
              refreshCanvasImages();
            }
          }
        });

        cy.on('unselect', 'node', data.eUnselect = function(evt) {
          if (options().appearOnGroupSelect) {
            let node = this;

            if (hoveredGroup && !hoveringOverDifferentGroup(node)) {
              hoveredGroup = null;
            }

            removeGroupFromSelectedGroups(node);
            refreshCanvasImages();
          }
        });

        cy.on('drag', 'node', data.eDrag = function() {
          if (isAnyGroupWithCue()) {
            refreshCanvasImages();
          }
        });

        function isMouseEvent(e) {
          return e.type.substring(0, 5) === 'mouse' || e.type === 'click';
        }

        function getTouchPageCoordinates(e) {
          if (e.type === 'touchstart') {
            return { x: event.touches[0].pageX,
              y: event.touches[0].pageY
            };
          }
          return { x: event.changedTouches[0].pageX,
            y: event.changedTouches[0].pageY
          };
        }

        function isEventOnCueRegion(node, event) {
          // needed so it matches the range for expandcollapses rendered locations
          const TOUCH_OFFSET_Y = 43;
          const expandcollapseRenderedStartX = node._private.data.expandcollapseRenderedStartX;
          let expandcollapseRenderedStartY = node._private.data.expandcollapseRenderedStartY;
          const expandcollapseRenderedRectSize = node._private.data.expandcollapseRenderedCueSize;
          const expandcollapseRenderedEndX = expandcollapseRenderedStartX + expandcollapseRenderedRectSize;
          const expandcollapseRenderedEndY = expandcollapseRenderedStartY + expandcollapseRenderedRectSize;

          let posX;
          let posY;
          if (event instanceof MouseEvent) {
            posX = event.offsetX;
            posY = event.offsetY;
          } else if (event instanceof TouchEvent) {
            const touchPageCoordinates = getTouchPageCoordinates(event);
            posX = touchPageCoordinates.x;
            posY = touchPageCoordinates.y - TOUCH_OFFSET_Y;
          } else {
            return false;
          }

          return posX >= expandcollapseRenderedStartX && posX <= expandcollapseRenderedEndX &&
                  posY >= expandcollapseRenderedStartY && posY <= expandcollapseRenderedEndY;
        }

        function getGroupOfClickedOnCue(event) {
          const clickedGroup = selectedGroups.find(group => isEventOnCueRegion(group, event));
          return clickedGroup ? clickedGroup : null;
        }

        function cueTap(event) {
          let node;
          if (hoveredGroup && isEventOnCueRegion(hoveredGroup, event)) {
            node = hoveredGroup;
          }
          else if (selectedGroups.length > 0) {
            node = getGroupOfClickedOnCue(event);
          }

          if (!node) {
            return;
          }
          let opts = options();

          event.preventDefault();
          event.stopPropagation();
          if(opts.undoable && !ur)
            ur = cy.undoRedo({
              defaultActions: false
            });
          if(api.isCollapsible(node))
            if (opts.undoable){
              ur.do("collapse", {
                nodes: node,
                options: opts
              });
            }
            else
              api.collapse(node, opts);
          else if(api.isExpandable(node))
            if (opts.undoable)
              ur.do("expand", {
                nodes: node,
                options: opts
              });
            else
              api.expand(node, opts);
          if (options().appearOnGroupSelect) {
            // mouse won't be in collapsed group, so shouldn't show cue
            if (hoveredGroup && api.isExpandable(node)) {
              hoveredGroup = null;
            }
            refreshCanvasImages();
          }
        }

        function isClickOnAnyCueRegion(event) {
          return (hoveredGroup && isEventOnCueRegion(hoveredGroup, event)) || (selectedGroups.length > 0 && getGroupOfClickedOnCue(event));
        }

        function interceptEventWithinCue(event) {
          if (isClickOnAnyCueRegion(event)){
            event.stopPropagation();
          }
        }

        $canvas.addEventListener('mousedown', interceptEventWithinCue);
        $canvas.addEventListener('mouseup', interceptEventWithinCue);
        $canvas.addEventListener('click', cueTap);
        $canvas.addEventListener('touchstart', interceptEventWithinCue);
        $canvas.addEventListener('touchend', cueTap);
      }

      // write options to data
      data.hasEventFields = true;
      setData( data );
    },
    unbind: function () {
        // var $container = this;
        var data = getData();

        if (!data.hasEventFields) {
          console.log( 'events to unbind does not exist' );
          return;
        }

        cy.trigger('expandcollapse.clearvisualcue');

        cy.off('mouseover', 'node', data.eMouseOver)
          .off('mouseout', 'node', data.eMouseOut)
          .off('mousedown', 'node', data.eMouseDown)
          .off('mouseup', 'node', data.eMouseUp)
          .off('free', 'node', data.eFree)
          .off('grab', 'node', data.eGrab)
          .off('position', 'node', data.ePosition)
          .off('add', 'node', data.eAdd)
          .off('select', 'node', data.eSelect)
          .off('unselect', 'node', data.eUnselect)
          .off('free', 'node', data.eFree)
          .off('zoom pan', data.eZoom)
          .off('drag', 'node', data.eDrag);

      window.removeEventListener('resize', data.eWindowResize);
      $canvas.removeEventListener('mousedown', interceptEventWithinCue);
      $canvas.removeEventListener('mouseup', interceptEventWithinCue);
      $canvas.removeEventListener('click', cueTap);
      $canvas.removeEventListener('touchstart', interceptEventWithinCue);
      $canvas.removeEventListener('touchend', cueTap);
    },
    rebind: function () {
      var data = getData();

      if (!data.hasEventFields) {
        console.log( 'events to rebind does not exist' );
        return;
      }

      cy.on('mouseover', 'node', data.eMouseOver)
        .on('mouseout', 'node', data.eMouseOut)
        .on('mousedown', 'node', data.eMouseDown)
        .on('mouseup', 'node', data.eMouseUp)
        .on('free', 'node', data.eFree)
        .on('grab', 'node', data.eGrab)
        .on('position', 'node', data.ePosition)
        .on('add', 'node', data.eAdd)
        .on('select', 'node', data.eSelect)
        .on('unselect', 'node', data.eUnselect)
        .on('free', 'node', data.eFree)
        .on('zoom pan', data.eZoom)
        .on('drag', 'node', data.eDrag);

      window.addEventListener('resize', data.eWindowResize);
      $canvas.addEventListener('mousedown', interceptCytoscapeEventsWithinCue);
      $canvas.addEventListener('mouseup', interceptCytoscapeEventsWithinCue);
      $canvas.addEventListener('click', cueTap);
      $canvas.addEventListener('touchstart', stopEvent);
      $canvas.addEventListener('touchend', cueTap);
    }
  };

  if (functions[fn]) {
    return functions[fn].apply(cy.container(), Array.prototype.slice.call(arguments, 1));
  } else if (typeof fn == 'object' || !fn) {
    return functions.init.apply(cy.container(), arguments);
  } else {
    throw new Error('No such function `' + fn + '` for cytoscape.js-expand-collapse');
  }

  return this;
};
