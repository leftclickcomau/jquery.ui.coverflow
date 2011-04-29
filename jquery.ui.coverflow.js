/*
 * jQuery UI CoverFlow
 * Enhanced by Leftclick.com.au with auto-advance, better controls and improved maths.
 * Re-written for jQueryUI 1.8.6/jQuery core 1.4.4 by Addy Osmani with adjustments for perspective change.
 * Original Component: Paul Bakaus for jQueryUI 1.7 series.
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
			center: true, // If false, element's base position isn't touched in any way
			recenter: true, // If false, the parent element's position doesn't get animated while items change
			autoAdvance: false, // If a number, the nex() function is called automatically once every [value] ms
			pauseOnHover: true // If false, don't pause the auto-advance on mouseover; ignored if autoAdvance is false
		},
		
		_create: function() {
			var self = this, o = this.options;
			this.items = $(o.items, this.element);
			this.props = o.orientation == 'vertical' ? ['height', 'Height', 'top', 'Top'] : ['width', 'Width', 'left', 'Left'];
			// For < 1.8.2: this.items['outer'+this.props[1]](1);

			this.itemSize = 0.4 * this.items.innerWidth();
			this.itemWidth = this.items.width();
			this.itemHeight = this.items.height();
			this.duration = o.duration;
			this.current = (o.item === 'middle') ? Math.floor(this.items.size() / 2) : o.item; //initial item
			this.autoAdvanceInterval = null;

			// Bind click events on individual items
			this.items.bind(o.trigger, function() {
				self.select(this);
			});

			// Center the actual parent's left side within it's parent
			this.element.css(this.props[2],
				(o.recenter ? -this.current * this.itemSize : 0)
				+ (o.center ? this.element.parent()[0]['offset'+this.props[1]]/2 - this.itemSize : 0) //Center the items container
				- (o.center ? parseInt(this.element.css('padding'+this.props[3]),10) || 0 : 0) //Subtract the padding of the items container
			);

			// Jump to the first item
			this._refresh(1, 0, this.current);

			if (o.autoAdvance > 0) {
				if (o.pauseOnHover) {
					// Control the auto advance timer by mouse events
					this.element.hover(function() {
						self.pauseAutoAdvance();
					}, function() {
						self.startAutoAdvance();
					});
				}
				// Initially start the auto advance timer
				this.startAutoAdvance();
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

		getCurrent: function() {
			return this.current;
		},

		next: function(noPropagation) {
			this.select((this.getCurrent() + 1) % this.items.size(), noPropagation);
		},

		select: function(item, noPropagation) {
			this.previous = this.current;
			this.current = !isNaN(parseInt(item,10)) ? parseInt(item,10) : this.items.index(item);

			// Don't animate when clicking on the same item
			if (this.previous == this.current) {
				return false
			}

			// Overwrite $.fx.step.coverflow everytime again with custom scoped values for this specific animation
			var self = this, to = Math.abs(self.previous-self.current) <=1 ? self.previous : self.current+(self.previous < self.current ? -1 : 1);
			$.fx.step.coverflow = function(fx) { 
				self._refresh(fx.now, to, self.current); 
			};
			
			// 1. Stop the previous animation
			// 2. Animate the parent's left/top property so the current item is in the center
			// 3. Use our custom coverflow animation which animates the item
			var animation = { coverflow: 1 };

			animation[this.props[2]] = (
				(this.options.recenter ? -this.current * this.itemSize : 0)
				+ (this.options.center ? this.element.parent()[0]['offset'+this.props[1]]/2 - this.itemSize : 0) // Center the items container
				- (this.options.center ? parseInt(this.element.css('padding'+this.props[3]),10) || 0 : 0) // Subtract the padding of the items container
			);

			// Trigger the 'select' event/callback
			if (!noPropagation) {
				this._trigger('select', null, this._uiHash());
			}

			this.element.stop().animate(animation, {
				duration: this.options.duration,
				easing: 'easeOutQuint'
			});
		},

		_refresh: function(state,from,to) {
			var self = this, offset = null;

			this.items.each(function(i) {
				var side = (i == to && from-to < 0 ) ||  i-to > 0 ? 'left' : 'right',
					mod = i == to ? (1-state) : ( i == from ? state : 1 ),
					before = (i > from && i != to),
					css = { zIndex: self.items.length + (side == "left" ? to-i : i-to) };
					css[($.browser.safari ? 'webkit' : 'Moz')+'Transform'] = 'matrix(1,'+(mod * (side == 'right' ? -0.2 : 0.2))+',0,1,0,0) scale('+(1+((1-mod)*0.3)) + ')';
					css[self.props[2]] = ((side === 'right' ? -1 : 1) * mod - i) * self.itemSize;

				if(!supportsTransforms) {
					css.width = self.itemWidth * (1+((1-mod)*0.5));
					css.height = css.width * (self.itemHeight / self.itemWidth);
					css.top = -((css.height - self.itemHeight) / 2);
				}
				$(this).css(css);
			});

			this.element.parent().scrollTop(0);
		},

		_uiHash: function() {
			return {
				item: this.items[this.current],
				value: this.current
			};
		}
	});
})(jQuery);
