var debounce = require('./debounce');

module.exports = function (params, cy, api) {
  var elementUtilities;
  var fn = params;

  var hoveredGroup, preventDrawing = false;
  let selectedGroups = [];

  const getData = function(){
    let scratch = cy.scratch('_cyExpandCollapse');
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
        $canvas.height = cy.height();
        $canvas.width = cy.width();
        $canvas.style.position = 'absolute';
        $canvas.style.top = 0;
        $canvas.style.left = 0;
        $canvas.style.zIndex = 999;

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

      let data = {};

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

      function anyNodeHasACue() {
        return hoveredGroup || selectedGroups.length > 0;
      }
  
      function hoveredGroupExistsAndNotInSelectedGroup() {
        return hoveredGroup && !selectedGroupsContainsGroup(hoveredGroup);
      }

      function drawCuesForSelectedGroups() {
        selectedGroups = selectedGroups.map(group =>  {
          drawExpandCollapseCue(group);
          return group
        });
      }

      function removeGroupFromSelectedGroups(node) {
        selectedGroups = selectedGroups.filter(group => group.id() !== node.id());
      }

      function mouseIsHoveringOver(node) {
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

      {
        cy.on('expandcollapse.clearvisualcue', function() {

          if ( hoveredGroup ) {
            clearDraws();
          }
        });

        cy.on('zoom pan', data.eZoom = function (e) {
          if (hoveredGroup || selectedGroups.length > 0) {
            clearDraws();
            if (options().appearOnGroupSelect) {
              drawCuesForSelectedGroups();
            }
          }
        });

        function selectedGroupsContainsGroup(group) {
          for (let i = 0; i < selectedGroups.length; i++) {
            if (selectedGroups[i].id() === group.id()) {
              return true;
            }
          }
          return false;
        }

        cy.on('mouseout', 'node', data.eMouseOut = function(e) {
          let node = this;
          if (mouseIsHoveringOver(node)) {
            clearDraws();
            if (!selectedGroupsContainsGroup(hoveredGroup)) {
              hoveredGroup = null;
            }
            drawCuesForSelectedGroups();
          }
        });

        cy.on('mouseover', 'node', data.eMouseOver = function (e) {
          let node = this;
          if (isAGroup(node)) {
            // clear draws if any
            if ( hoveredGroup && hoveredGroup.id() != node.id() ) {
              clearDraws();
              if (options().appearOnGroupSelect) {
                drawCuesForSelectedGroups();
              }
            }
            // if (node) {
            //   if (!selectedGroupsContainsGroup(node)) {
            //     drawExpandCollapseCue(node);
            //     // hoveredGroup = node;
            //   }
            //   // else {
            //   hoveredGroup = node;
            //   // }
            // }
            if (!selectedGroupsContainsGroup(node)) {
              drawExpandCollapseCue(node);
              hoveredGroup = node;
            }
          } else {
            // needed incase we hover over a regular node inside a group
            clearDraws();
            hoveredGroup = null;
            drawCuesForSelectedGroups();
          }
        });

        var oldMousePos = null, currMousePos = null;
        cy.on('mousedown', 'node', data.eMouseDown = function(e){
          oldMousePos = e.renderedPosition || e.cyRenderedPosition
        });
        cy.on('mouseup', 'node', data.eMouseUp = function(e){
          currMousePos = e.renderedPosition || e.cyRenderedPosition
        });

        cy.on('grab', 'node', data.eGrab = function (e) {
          preventDrawing = true;
        });

        cy.on('free', 'node', data.eFree = function (e) {
          preventDrawing = false;
        });

        cy.on('position', 'node', data.ePosition = function () {
          if (hoveredGroup) {
            clearDraws();
            if (options().appearOnGroupSelect) {
              drawCuesForSelectedGroups();
            }
          }
        });

        cy.on('remove', 'node', data.eRemove = function () {
          if (!options().appearOnGroupSelect) {
            clearDraws();
            hoveredGroup = null;
          }
        });

        var ur;
        cy.on('select', 'node', data.eSelect = function(evt){
          if (this.length > cy.nodes(":selected").length)
            this.unselect();

          if (options().appearOnGroupSelect) {
            let node = this;
            if (isAGroup(node)) {
              // if (hoveredGroup && hoveredGroup.id() === node.id() && !selectedGroupsContainsGroup(node)) {
              //   this.unselect();
              //   return;
              // }
              if (!selectedGroupsContainsGroup(node) && hoveredGroup) {
                selectedGroups.push(hoveredGroup);
              }
              else if (!selectedGroupsContainsGroup(node) && !hoveredGroup) {
                selectedGroups.push(drawExpandCollapseCue(node));
              }
            }
          }
        });

        cy.on('unselect', 'node', data.eUnselect = function(evt) {
          if (options().appearOnGroupSelect) {
            let node = this;
            clearDraws();

            if (node) {
              removeGroupFromSelectedGroups(node);
              drawCuesForSelectedGroups();
            }
          }
        });

        cy.on('drag', 'node', data.eDrag = function() {
          if (anyNodeHasACue()) {
            clearDraws();
            drawCuesForSelectedGroups();
            if (hoveredGroupExistsAndNotInSelectedGroup()) {
              drawExpandCollapseCue(hoveredGroup);
            }
          }
        });

        function cueClick(event) {
          let node = hoveredGroup;
          let opts = options();

          if (node){

            var expandcollapseRenderedStartX = node._private.data.expandcollapseRenderedStartX;
            var expandcollapseRenderedStartY = node._private.data.expandcollapseRenderedStartY;
            var expandcollapseRenderedRectSize = node._private.data.expandcollapseRenderedCueSize;
            var expandcollapseRenderedEndX = expandcollapseRenderedStartX + expandcollapseRenderedRectSize;
            var expandcollapseRenderedEndY = expandcollapseRenderedStartY + expandcollapseRenderedRectSize;
            if (event.offsetX >= expandcollapseRenderedStartX && event.offsetX <= expandcollapseRenderedEndX &&
                event.offsetY >= expandcollapseRenderedStartY && event.offsetY <= expandcollapseRenderedEndY) {

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
                clearDraws();
                // needed if we expand a group but we are still hovering over it to draw it's cue
                if (hoveredGroup && api.isCollapsible(node) && !selectedGroupsContainsGroup(hoveredGroup)) {
                  drawExpandCollapseCue(hoveredGroup);
                }
                drawCuesForSelectedGroups();
              }
            }
          }
        }

        $canvas.addEventListener('click', cueClick);

        // cy.on('tap', 'node', data.eTap = function (event) {
        //   var node = this;
        //   var opts = options();
        //   let nodeHasCue = selectedGroupsContainsGroup(node);
        //   if (hoveredGroup) {
        //     nodeHasCue = nodeHasCue || hoveredGroup._private.data.id === node._private.data.id;
        //   }
        //   if (nodeHasCue){
        //     var expandcollapseRenderedStartX = node._private.data.expandcollapseRenderedStartX;
        //     var expandcollapseRenderedStartY = node._private.data.expandcollapseRenderedStartY;
        //     var expandcollapseRenderedRectSize = node._private.data.expandcollapseRenderedCueSize;
        //     var expandcollapseRenderedEndX = expandcollapseRenderedStartX + expandcollapseRenderedRectSize;
        //     var expandcollapseRenderedEndY = expandcollapseRenderedStartY + expandcollapseRenderedRectSize;
                    
        //             var cyRenderedPos = event.renderedPosition || event.cyRenderedPosition;
        //     var cyRenderedPosX = cyRenderedPos.x;
        //     var cyRenderedPosY = cyRenderedPos.y;
        //     var factor = (opts.expandCollapseCueSensitivity - 1) / 2;

        //     if ( (Math.abs(oldMousePos.x - currMousePos.x) < 5 && Math.abs(oldMousePos.y - currMousePos.y) < 5)
        //       && cyRenderedPosX >= expandcollapseRenderedStartX - expandcollapseRenderedRectSize * factor
        //       && cyRenderedPosX <= expandcollapseRenderedEndX + expandcollapseRenderedRectSize * factor
        //       && cyRenderedPosY >= expandcollapseRenderedStartY - expandcollapseRenderedRectSize * factor
        //       && cyRenderedPosY <= expandcollapseRenderedEndY + expandcollapseRenderedRectSize * factor) {
        //       if(opts.undoable && !ur)
        //         ur = cy.undoRedo({
        //           defaultActions: false
        //         });
        //       if(api.isCollapsible(node))
        //         if (opts.undoable){
        //           ur.do("collapse", {
        //             nodes: node,
        //             options: opts
        //           });
        //         }
        //         else
        //           api.collapse(node, opts);
        //       else if(api.isExpandable(node))
        //         if (opts.undoable)
        //           ur.do("expand", {
        //             nodes: node,
        //             options: opts
        //           });
        //         else
        //           api.expand(node, opts);
        //       if (options().appearOnGroupSelect) {
        //         clearDraws();
        //         drawCuesForSelectedGroups();
        //       }
        //     }
        //   }
        // });
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
          .off('mousemove', 'node', data.eMouseMove)
          .off('mousedown', 'node', data.eMouseDown)
          .off('mouseup', 'node', data.eMouseUp)
          .off('free', 'node', data.eFree)
          .off('grab', 'node', data.eGrab)
          .off('position', 'node', data.ePosition)
          .off('remove', 'node', data.eRemove)
          .off('add', 'node', data.eAdd)
          .off('select', 'node', data.eSelect)
          .off('unselect', 'node', data.eUnselect)
          .off('free', 'node', data.eFree)
          .off('zoom pan', data.eZoom)
          .off('drag', 'node', data.eDrag);

      window.removeEventListener('resize', data.eWindowResize);
      $canvas.removeEventListener('click', cueClick);
    },
    rebind: function () {
      var data = getData();

      if (!data.hasEventFields) {
        console.log( 'events to rebind does not exist' );
        return;
      }

      cy.on('mouseover', 'node', data.eMouseOver)
        .on('mouseout', 'node', data.eMouseOut)
        .on('mousemove', 'node', data.eMouseMove)
        .on('mousedown', 'node', data.eMouseDown)
        .on('mouseup', 'node', data.eMouseUp)
        .on('free', 'node', data.eFree)
        .on('grab', 'node', data.eGrab)
        .on('position', 'node', data.ePosition)
        .on('remove', 'node', data.eRemove)
        .on('add', 'node', data.eAdd)
        .on('select', 'node', data.eSelect)
        .on('unselect', 'ndoe', data.eUnselect)
        .on('free', 'node', data.eFree)
        .on('zoom pan', data.eZoom)
        .on('drag', 'node', data.eDrag);

      window.addEventListener('resize', data.eWindowResize);
      $canvas.addEventListener('click', cueClick);
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
