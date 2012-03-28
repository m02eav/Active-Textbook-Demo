; // start this bad boy off with a semicolon, thats right a semicolon

(function($) {

    /************************************************/
    /************ BEGIN Plugin Definition ***********/

    // Plugin methods. Basically, for the future
    var methods = {

        init : function(options) {

            // Lets use just one namespace; btw, a getter can be used
            var defaults = {
                frameRate: 50,
                scaleRate: 50,
                minScale: 0.3,
                maxScale: 4,
                shouldPan: function() { return true; },
                shouldZoom: function() { return true; },
                fitToWindow: function() { return true; },
                fitToPage: function() { return true; } 
            };

            return this.each(function() {
                var $this = $(this);

                // for a whole set - options will be the same
                if (typeof options != 'undefined') { 
                    $.extend(defaults, options);
                }

                // individual for each:
                var virtualRect = new VirtualRectangle($this, defaults);
                    virtualRect.resetTransform();
                
                // Note: renderer can be used for some animation later..
                //var renderer = new Renderer(defaults.frameRate);

                // bind events
                bindMouseWheelHandler($this, virtualRect, defaults);
                bindFitToWidthHandler($this, virtualRect, defaults);
                bindMouseDownHandler($this, virtualRect, defaults);

                // in progress:
                
    			//bindGestureHandler($elem, virtualRect, startRender, stopRender, options);
		    	
            });
        },
        
        destroy : function() {
            //at least, unbind event handlers..

            return this.each(function() {
                var $this = $(this);

                $this.unbind('.zoomAndScale');
            });
        } 

    };


    // Plugin handlers
    var bindMouseWheelHandler = function($this, vRect, defaults) {

        // zoom via mouse wheel events
        $this.bind('mousewheel.zoomAndScale', function(event, dt) {
            event.preventDefault();
            if ( !defaults.shouldZoom() ) return;

            vRect.zoom(event.pageX, event.pageY, dt*defaults.scaleRate);

			//renderer.startRender(true); 
            //renderer.startRender(callback, true);
		});
	};

    var bindFitToWidthHandler = function($this, vRect, defaults) {

        // fitToWidth via dblClick
        $this.bind("dblclick.zoomAndScale", function(event) {
            event.preventDefault();
			if ( !defaults.shouldZoom() ) return;

            if (event.which == 1) {
                //left dblclick
                vRect.fitToWidth(event.pageX, event.pageY);
            } else {
                //scroll dblclick
                vRect.fitToHeight(event.pageX, event.pageY);
            }
		});
    };

    var bindMouseDownHandler = function($this, vRect, defaults) {
		var mouseTrack = false;
		var mousePos = {
			x: 0,
			y: 0
		}

		// only pan:
		$this.bind("mousedown.zoomAndScale", function(event) {
            //unselectable
            event.preventDefault();

			mousePos.x = event.pageX;
			mousePos.y = event.pageY;

			mouseTrack = true;
		}
        ).bind("mouseup.zoomAndScale", function(event) {
			mouseTrack = false;
		}
        ).bind("mousemove.zoomAndScale", function(event) {
			if ( !defaults.shouldPan() ) return;

			if (mouseTrack) {
                vRect.pan(event.pageX - mousePos.x, event.pageY - mousePos.y);

				mousePos.x = event.pageX;
				mousePos.y = event.pageY;
			}
		});
		
	};

    // Plugin in the flesh
    $.fn.zoomAndScale = function(method) {

        if (methods[method]) {
            return methods[method].apply(this, Array.prototype.slice.call(arguments, 1) );
        } else if (typeof method === 'object' || ! method) {
            return methods.init.apply(this, arguments);
        } else {
            $.error('Method ' +  method + ' does not exist in jQuery.zoomAndScale');
        }

	};

    /************  END Plugin Definition  ***********/
    /************************************************/


    /************************************************/
	/********* BEGIN VRectangle Definition **********/

	var VirtualRectangle = function($this, options) {
        var self = this;

        /***** public *******/

        // rectangle properties
        this.top = $this.position().top;
		this.left = $this.position().left;
		this.width = $this.width();
		this.height = $this.height();
		this.scale = 1.0;


        /***** private ******/

        // browser specific information
        var $browser = $.browser;

        // ability to restore start condition
        var startRect = {
            top: this.top,
            left: this.left,
            width: this.width,
            height: this.height,
            scale: this.scale
        };

        // some flag to check condition
        var fitToWindowFlag = false;
        var fitToPageFlag = false;


        // scale acoording to options
        var getScale = function(width, height) {
            if (width != 0) {
                return Math.min(Math.max(width / startRect.width, options.minScale), options.maxScale);
            } else if (height != 0) {
                return Math.min(Math.max(height / startRect.height, options.minScale), options.maxScale);
            } else {
                return this.scale;
            }
        };

        var zoomSizeModification = function() {
            if (options.fitToWindow || options.fitToPage) {
                var wWidth = $(window).width();
                var wHeight = $(window).height();

                /*
                if (options.fitToPage) {
                    wWidth = 2 * wWidth;
                }
                */

                var widthScale = wWidth / startRect.width;
                var heightScale = wHeight/ startRect.height;

                // Portrait => limit by width
                var portrait = (self.width/wWidth < self.height/wHeight);

                var newScale = (portrait ? 
                            Math.min(Math.max(self.scale, heightScale), widthScale) : 
                            Math.min(Math.max(self.scale, widthScale), heightScale)
                );

                if (newScale != self.scale) {
                    self.scale = newScale;
                    self.width = self.scale * startRect.width;
                    self.height = self.scale * startRect.height;
                }
            }
        };

        var zoomPositionModification = function() {
            if (options.fitToWindow || options.fitToPage) {
                var wWidth = $(window).width();
                var wHeight = $(window).height();

                /*
                if (options.fitToPage) {
                    wWidth = 2 * wWidth;
                }
                */

                // Portrait => limit by width
                var portrait = (self.width/wWidth < self.height/wHeight);

                if (portrait) {
                    self.left = Math.min(Math.max(self.left, 0), (wWidth - self.width));
                    self.top = Math.min(Math.max(self.top, (wHeight - self.height)), 0);
                } else {
                    self.left = Math.min(Math.max(self.left, (wWidth - self.width)), 0);
                    self.top = Math.min(Math.max(self.top, 0), (wHeight - self.height));
                }
            }
        };


        /***** getters ******/
        /* /
        this.getZoom = function() {
		    return this.scale;
    	};

        this.getOffsetX = function() {
		    return $this.position().left - this.left;
	    };

        this.getOffsetY = function() {
		    return $this.position().top - this.top;
    	};


        /***** setters ******/
        /* /
        this.setPosition = function(x, y) {
		    this.top = y;
		    this.left = x;
	    };


        /***** methods ******/

        this.resetTransform = function() {
            this.applyTransform("0 0", true);
        };

        this.applyTransform = function(str, origin) {
            if (typeof origin == 'undefined') {
                origin = false;
            }

            if ($browser.webkit) {
                //alert('webkit: ' + parseInt($browser.version, 10));
                $this.css('-webkit-transform' + (origin ? '-origin' : ''), str);
            }

            // some debug for support in future
            if ($browser.opera) {
                //alert('opera: ' + parseInt($browser.version, 10));
            }
            if ($browser.safari) {
                //alert('safari: ' + parseInt($browser.version, 10));
            }
            if ($browser.msie) {
                //alert('msie: ' + parseInt($browser.version, 10));
                $this.css('-ms-transform' + (origin ? '-origin' : ''), str);
            }
            if ($browser.mozilla) {
                //alert('mozilla: ' + parseInt($browser.version, 10));
                $this.css('-moz-transform' + (origin ? '-origin' : ''), str);
            }
        };

        this.pan = function(deltaX, deltaY) {
            this.left += deltaX;
            this.top += deltaY;

            zoomPositionModification();

            $this.offset({ top: this.top, left: this.left });
        }

        this.zoom = function(pageX, pageY, delta) {
            var scale = getScale(this.width + delta, this.height + delta);
            this.zoomToScale(scale, pageX, pageY);
	    };

        this.fitToWidth = function(pageX, pageY) {
            var wWidth = $(window).width();

            var scale = wWidth / startRect.width;
            this.zoomToScale(scale, pageX, pageY);
        };

        this.fitToHeight = function(pageX, pageY) {
            var wHeight = $(window).height();

            var scale = wHeight / startRect.height;
            this.zoomToScale(scale, pageX, pageY);
        };

        this.zoomToScale = function(scale, pageX, pageY) {
            if (scale != this.scale) {
                this.scale = scale;

                // save previous:
                var curWidth = this.width;
                var curHeight = this.height;
                
                //ok, calculate new size:
                this.width = scale * startRect.width;
                this.height = scale * startRect.height;

                zoomSizeModification();

                //ok, calculate new position:
                var layerX = pageX - this.left;
                var layerY = pageY - this.top;
                
                this.left = pageX - layerX * this.width / curWidth;
                this.top = pageY - layerY * this.height / curHeight;

                zoomPositionModification();


                // apply changes:
                var str =  'scale(' + this.scale + ') ';
                    //str += 'translate('+-this.getOffsetX()+'px, '+-this.getOffsetY()+'px)'
                
                this.applyTransform(str);
                $this.offset({ top: this.top, left: this.left });
            }
	    };

	};

    /********* END VRectangle Definition ************/
    /************************************************/


    /************************************************/
    /************ BEGIN Renderer Definition *********/

    /* TODO: perhaps, there should be a stack.. */

    var Renderer = function(frameRate) {
        // Ahtung, magick numbers here
        var stopTimeOption = 55;

        var timer = false;
        var stopTimer = false;
        var dontRenderFlag = true;
        
		var render = function() {
			if (dontRenderFlag) return;

			//$elem.css('-webkit-transform', getTransformString(virtualRect) );
            //alert('render();');
            //callback to vRect?

            // a small cleanup here..
            clearTimeout(timer);
			timer = setTimeout(render, frameRate);
		};

        // public:
        this.startRender = function(timeout) {
			if (dontRenderFlag) {
				dontRenderFlag = false;

			    render();

                // set the timeout to stop running
                if (typeof timeout != 'undefined') {
                    clearTimeout(stopTimer);
				    stopTimer = setTimeout(this.stopRender(), stopTimeOption);
			    }
			}
		};

		this.stopRender = function() {
			dontRenderFlag = true;

            // ..and there
            clearTimeout(timer);
            clearTimeout(stopTimer);
		};
    };

    /************ END Renderer Definition ***********/
    /************************************************/


/* /

	VirtualRectangle.prototype.applyScale = function(originX, originY, scale, startRect) {

		//alert("4");
		
		
		var width = scale * startRect.width;
		var height = scale * startRect.height;
//alert("5");
		if( width /  this.startRect.width > this.options.maxScale) {
			width = this.startRect.width * this.options.maxScale;
			height = this.startRect.height * this.options.maxScale;
		}
//alert("6");
		var rightShift = (originX)/(this.startRect.width) * (width - this.width);
		var upShift = (originY)/(this.startRect.height) * (height - this.height);

		
		// we want to keep the transorm origin in th same place on screen
		// so we need to do a transformation to compensate
		// var rightShift =0// 0.5 * (width - this.width);
		// var upShift = 0//.5 * (height - this.height);
		//alert("7");
		this.width = width;
		this.height = height;
		this.scale = this.width / this.startRect.width;
		//alert("8");
		this.top -= upShift;
		this.left -= rightShift;
	};

	var bindGestureHandler = function($elem, vRect, startRender, stopRender, options) {

		var timeout; // capture this the click handler functions closure
		var startRect = {
			height: vRect.height,
			width: vRect.width
		}

		$elem.on("gesturestart", function(event) {
			event.preventDefault();
			//alert("1");
			
			// need to apply zooms relative to the rectangle
			// size at the start of the gesture
			startRect.height = vRect.height;
			startRect.width = vRect.width;
			startRect.pageX = event.originalEvent.pageX;
			startRect.pageY = event.originalEvent.pageY;
			startRender();
		}).on("gestureend", function(event) {
			event.preventDefault();
			//alert("2");
			stopRender();
		}).on("gesturechange", function(event) {
			event.preventDefault();
			//alert("3");
			vRect.applyScale(event.originalEvent.pageX, event.originalEvent.pageY, event.originalEvent.scale, startRect);
			vRect.pan((event.originalEvent.pageX - startRect.pageX), (event.originalEvent.pageY - startRect.pageY)) ;
			startRect.pageX = event.originalEvent.pageX;
			startRect.pageY = event.originalEvent.pageY;
		});
	}

/* */


})(jQuery);