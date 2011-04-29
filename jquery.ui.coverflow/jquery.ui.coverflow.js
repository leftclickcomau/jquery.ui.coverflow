/*
 * jQuery UI CoverFlow
 * Enhanced by Leftclick.com.au with auto-advance, better controls and improved maths.
 * Re-written for jQueryUI 1.8.6/jQuery core 1.4.4 by Addy Osmani with adjustments for perspective change.
 * Original Component: Paul Bakaus for jQueryUI 1.7 series.
 * 
 * Requirements:
 * 
 * jQuery (this version tested with 1.5)
 * jQuery UI (this version tested with 1.8.9)
 * Sylvester.js (for transforms with IE, required by TransformIE.js)
 * TransformIE.js (for transforms with IE)
 */

(function($) {
	var browserVersion = $.browser.version.replace(/^(\d+\.)(.*)$/, function() { return arguments[1] + arguments[2].replace(/\./g, ''); });
	var supportsTransforms = !($.browser.mozilla && (parseFloat(browserVersion) <= 1.9)) && !$.browser.opera;

	$.easing.easeOutQuint = function (x, t, b, c, d) {
		return c*((t=t/d-1)*t*t*t*t + 1) + b;
	};

	$.widget('ui.coverflow', {
		options: {
			items: '> *',
			orientation: 'horizontal',
			item: 0,
			trigger: 'click',
			duration: 600,
			currentItemZoom: 0.3,
			center: true, // If false, element's base position isn't touched in any way
			recenter: true, // If false, the parent element's position doesn't get animated while items change
			autoAdvance: false, // If a number, the nex() function is called automatically once every [value] ms
			pauseOnHover: true, // If false, don't pause the auto-advance on mouseover; ignored if autoAdvance is false
			refreshOnWindowResize: true // If false, don't automatically refresh when the window is resized
		},
		
		_create: function() {
			var self = this, o = this.options;
			this.items = $(o.items, this.element);
			this.props = o.orientation == 'vertical' ? ['height', 'Height', 'top', 'Top'] : ['width', 'Width', 'left', 'Left'];
			this.transformProp = ($.browser.safari ? 'webkit' : 'Moz')+'Transform';
			this.itemSize = (0.5 + (parseInt(this.items.first().css('margin'+this.props[3]), 10) || 0) / this.items[0]['offset'+this.props[1]]) * this.items.innerWidth();
			this.itemWidth = this.items.width();
			this.itemHeight = this.items.height();
			this.currentIndex = o.item; //initial item
			this.previousIndex = this.currentIndex;
			this.targetIndex = this.currentIndex;
			this.autoAdvanceInterval = null;
			this.dummy = null;

			// Bind click events on individual items
			this.items.bind(o.trigger, function() {
				self.select(this);
			});

			// Initialise the display
			this._completeAdjustElements();
			this._recenter();

			// Setup auto-advance and/or pause-on-hover
			if (o.autoAdvance > 0) {
				if (o.pauseOnHover) {
					this.element.hover(function() {
						self.pauseAutoAdvance();
					}, function() {
						self.startAutoAdvance();
					});
				}
				this.startAutoAdvance();
			}

			// Setup window resize adjustment
			if (o.refreshOnWindowResize) {
				$(window).resize(function() {
					self._recenter();
				});
			}
		},

		startAutoAdvance: function() {
			var self = this;
			this.autoAdvanceInterval = setInterval(function() {
				self.next();
			}, this.options.autoAdvance);
		},

		pauseAutoAdvance: function() {
			clearInterval(this.autoAdvanceInterval);
			this.autoAdvanceInterval = null;
		},

		getCurrentIndex: function() {
			return this.currentIndex;
		},

		previous: function(noPropagation) {
			this.select((this.currentIndex + this.items.size() - 1) % this.items.size(), noPropagation);
		},

		next: function(noPropagation) {
			this.select((this.currentIndex + 1) % this.items.size(), noPropagation);
		},

		select: function(item, noPropagation, noStop) {
			var self = this, 
				from = self.currentIndex,
				css = {};

			// Update the internal markers
			this.previousIndex = this.currentIndex;
			this.targetIndex = !isNaN(parseInt(item,10)) ? parseInt(item,10) : this.items.index(item);
			this.currentIndex += (this.targetIndex > this.currentIndex) ? 1 : -1;

			// Don't animate when selecting the same item
			if (this.previousIndex !== this.currentIndex) {
				// Trigger the 'select' event/callback
				if (!noPropagation) {
					this._trigger('select', null, this._uiHash());
				}
				css[this.props[2]] = this._getElementPosition();
				if (!noStop) {
					this.element.stop();
				}
				this._beginAdjustElements();
				this.element.animate(css, {
					duration: this.options.duration / Math.abs(this.previousIndex - this.targetIndex),
					easing: 'easeOutQuint',
					step: function(now, fx) {
						self._refresh(fx.state, from, self.currentIndex);
					},
					complete: function() {
						self._completeAdjustElements();
						self._recenter();
						if (self.currentIndex !== self.targetIndex) {
							self.select(self.targetIndex, noPropagation, true);
						}
					}
				});
			}
		},

		_refresh: function(state, from, to) {
			var self = this, 
				offset = null, 
				o = this.options, 
				transferring = (from < to ? 0 : this.items.length - 1);
			if (this.dummy !== null) {
				// I don't understand how this works, but it does!
				this.dummy.css(this.props[2], (from < to ? (2 - this.items.length) : (this.items.length * -2) - 1) * self.itemSize);
				this.dummy.css(this.transformProp, 'matrix(1,'+ (from > to ? -0.2 : 0.2) +',0,1,0,0) scale(' + state + ')');
			}
			this.items.each(function(i) {
				var side = (((i == to) && (from < to)) || (i > to)) ? 'left' : 'right',
					mod = (i === to) ? (1 - state) : ((i === from) ? state : 1),
					css = { zIndex: self.items.length + (side == 'left' ? (to - i) : (i - to)) },
					scale = (supportsTransforms && (i === transferring)) ? (state === 1 ? 1 : 1 - state) : (1+((1-mod)*o.currentItemZoom));
				css[self.props[2]] = ((side === 'right' ? -1 : 1) * mod - i + 1) * self.itemSize;
				if (supportsTransforms) {
					css[self.transformProp] = 'matrix(1,' + (mod * (side == 'right' ? -0.2 : 0.2)) + ',0,1,0,0) scale(' + scale + ')';
				} else {
					$.extend(css, {
						width: self.itemWidth * scale,
						height: self.itemHeight * scale,
						top: -((self.itemHeight * (scale - 1)) / 2)
					});
				}
				$(this).css(css);
			});
			this.element.parent().scrollTop(0);
		},

		_recenter: function() {
			this.element.css(this.props[2], this._getElementPosition());
		},

		_getElementPosition: function() {
			return (
				(this.options.center ? this.element.parent()[0]['offset'+this.props[1]]/2 - this.itemSize : 0) // Center the items container
				- (this.options.center ? parseInt(this.element.css('padding'+this.props[3]),10) || 0 : 0) // Subtract the padding of the items container
				- (this.options.recenter ? (this.currentIndex + 1) * this.itemSize : 0)
			);
		},

		_beginAdjustElements: function() {
			this.dummy = (this.currentIndex > this.items.length / 2) ? 
				this.items.first().clone() : this.items.last().clone();
			$(this.element).append(this.dummy);
		},

		_completeAdjustElements: function() {
			var midpoint = this.items.length / 2;
			if (this.dummy !== null) {
				this.dummy.remove();
			}
			while (this.currentIndex > midpoint) {
				$(this.element).append(this.items[0]);
				this.currentIndex--;
				this.targetIndex--;
				this.previousIndex--;
			}
			while (this.currentIndex < midpoint - 1) {
				$(this.element).prepend(this.items[this.items.length - 1]);
				this.currentIndex++;
				this.targetIndex++;
				this.previousIndex++;
			}
			this.items = $(this.options.items, this.element);
			this._refresh(1, this.currentIndex, this.currentIndex);
		},

		_uiHash: function() {
			return {
				item: this.items[this.currentIndex],
				value: this.currentIndex
			};
		}
	});
})(jQuery);
