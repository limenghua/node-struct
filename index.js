/**
 * Default export `Struct`.
 */
// export default Struct;
module.exports = exports = Struct;

// compatibility
exports.Struct = Struct;

function ByteField(p, offset) {
    this.length = 1;
    this.offset = offset;
    this.get = function() {
        return p.buf[offset];
    }
    this.set = function(val) {
        p.buf[offset] = val;
    }
}
function FloatField(p,offset,le){
    this.lenght = 4;
    this.offset = offset;

    var  nativeSuff = 'Float'+ (le?'LE':'BE');
    var  readMethod = Buffer.prototype['read' + nativeSuff];
    var  writeMethod = Buffer.prototype['write' + nativeSuff];

    if(!readMethod || !writeMethod){
        throw  new Error('Buffer do not has the method:read'+nativeSuff+'and write'+nativeSuff);
    }
    this.get = function(){
        return  readMethod.call(p.buf,offset);
    }
    this.set = function(val){
        writeMethod.call(p.buf,val,offset);
    }
}

function DoubleField(p,offset,le){
    this.length = 8;
    this.offset = offset;

    var  nativeSuff = 'Double'+ (le?'LE':'BE');
    var  readMethod = Buffer.prototype['read' + nativeSuff];
    var  writeMethod = Buffer.prototype['write' + nativeSuff];

    if(!readMethod || !writeMethod){
        throw  new Error('Buffer do not has the method:read'+nativeSuff+'and write'+nativeSuff);
    }
    this.get = function(){
        return  readMethod.call(p.buf,offset);
    }
    this.set = function(val){
        writeMethod.call(p.buf,val,offset);
    }
}

function BoolField(p, offset, length) {
    this.length = length;
    this.offset = offset;
    this.get = function() {
        return (p.buf[offset] > 0 );
    }
    this.set = function(val) {
        p.buf[offset] = val ? 1 : 0;
    }
}

function IntField(p, offset, length, le, signed) {
    this.length = length;
    this.offset = offset;

    function bec(cb) {
        for (var i = 0; i < length; i++)
            cb(i, length - i - 1);
    }

    function lec(cb) {
        for (var i = 0; i < length; i++)
            cb(i, i);
    }

    function getUVal(bor) {
        var val = 0;
        bor(function(i, o) {
            val += Math.pow(256, o) * p.buf[offset + i];
        })
        return val;
    }

    function getSVal(bor) {

        var val = getUVal(bor);
        if ((p.buf[offset + ( le ? (length - 1) : 0)] & 0x80) == 0x80) {
            val -= Math.pow(256, length);
        }
        return val;
    }

    function setVal(bor, val) {
        bor(function(i, o) {
            p.buf[offset + i] = Math.floor(val / Math.pow(256, o)) & 0xff;
        });
    }
    
    var 
     nativeSuff = (signed?'':'U') +'Int'+ (length*8)+ (le?'LE':'BE'),
     readMethod = Buffer.prototype['read' + nativeSuff], writeMethod = Buffer.prototype['write' + nativeSuff];
       
    
    if (!readMethod) {
        this.get = function() {
            var bor = le ? lec : bec;
            return ( signed ? getSVal(bor) : getUVal(bor));
        }
    }
    else {
        this.get = function() {
            return readMethod.call(p.buf,offset);
        };    
    }

    
    if (!writeMethod) {
        this.set = function(val) {
            var bor = le ? lec : bec;
            setVal(bor, val);
        }
    }
    else {
        this.set = function(val){
           writeMethod.call(p.buf,val,offset); 
        }
    }

}


function CharField(p, offset, length, encoding) {
    var self = this;
    self.length = length;
    self.offset = offset;
    self.encoding = encoding;
    self.get = function() {
        if (!length) return;

        var result = p.buf.toString(self.encoding, offset, offset + length);
        var strlen = result.indexOf("\0");
        if (strlen == -1) {
            return result;
        } else {
            return result.slice(0, strlen);
        }
    }
    self.set = function(val) {
        if (!length) return;

        /*
        // comment off these might be less rubust, but chars encoding
        // would be ok
        val += "\0";
        if (val.length > length)
            val = val.substring(0, length);
        */

        // buf.write(string, [offset], [length], [encoding])
        p.buf.write(val, offset, length, self.encoding);
    }
}

function StructField(p, offset, struct) {
    this.length = struct.length();
    this.offset = offset;
    this.get = function() {
        return struct;
    }
    this.set = function(val) {
        struct.set(val);
    }
    this.allocate = function() {
        struct._setBuff(p.buf.slice(offset, offset + struct.length()));
    }
}

function ArrayField(p, offset, len, type) {
    var as = Struct();
    var args = [].slice.call(arguments, 4);
    args.unshift(0);
    for (var i = 0; i < len; i++) {
        if ( type instanceof Struct) {
            as.struct(i, type.clone());
        } else if ( type in as) {
            args[0] = i;
            as[type].apply(as, args);
        }
    }
    this.length = as.length();
    this.offset = offset;
    this.allocate = function() {
        as._setBuff(p.buf.slice(offset, offset + as.length()));
    }
    this.get = function() {
        return as;
    }
    this.set = function(val) {
        as.set(val);
    }
}

function Struct() {
    if (!(this instanceof Struct))
        return new Struct;

    var priv = {
        buf : {},
        allocated : false,
        len : 0,
        fields : {},
        closures : []
    }, self = this;

    function checkAllocated() {
        if (priv.allocated)
            throw new Error('Cant change struct after allocation');
    }


    this.word8 = function(key) {
        checkAllocated();
        priv.closures.push(function(p) {
            p.fields[key] = new ByteField(p, p.len);
            p.len++;
        });
        return this;
    };

    [true,false].forEach(function(le){
        var name = 'float'+( le ? 'le' : 'be');
        self[name] = function(key){
            checkAllocated()
            priv.closures.push(function(p){
                p.fields[key] = new FloatField(p, p.len,le);
                p.len += 4;
            })
            return this;
        };
    });

    [true,false].forEach(function(le){
        var name = 'double' + (le ? 'le' : 'be');
        self[name] = function(key){
            checkAllocated();
            priv.closures.push(function(p){
                p.fields[key] = new DoubleField(p, p.len,le);
                p.len += 8;
            });
            return this;
        }
    });

    // Create handlers for various Bool Field Variants
    [1, 2, 3, 4].forEach(function(n) {
        self['bool' + (n == 1 ? '' : n)] = function(key) {
            checkAllocated();
            priv.closures.push(function(p) {
                p.fields[key] = new BoolField(p, p.len, n);
                p.len += n;
            });
            return this;
        }
    });

    // Create handlers for various Integer Field Variants
    [1, 2, 3, 4, 6, 8].forEach(function(n) {
        [true, false].forEach(function(le) {
            [true, false].forEach(function(signed) {
                var name = 'word' + (n * 8) + ( signed ? 'S' : 'U') + ( le ? 'le' : 'be');
                self[name] = function(key) {
                    checkAllocated();
                    priv.closures.push(function(p) {
                        p.fields[key] = new IntField(p, p.len, n, le, signed);
                        p.len += n;
                    });
                    return this;
                };
            });
        });
    });

    this.chars = function(key, length, encoding) {
        checkAllocated();
        priv.closures.push(function(p) {
            p.fields[key] = new CharField(p, p.len, length, encoding || 'ascii');
            p.len += length;
        });
        return this;
    }

    this.struct = function(key, struct) {
        checkAllocated();
        priv.closures.push(function(p) {
            p.fields[key] = new StructField(p, p.len, struct.clone());
            p.len += p.fields[key].length;
        });
        return this;
    }
    function construct(constructor, args) {
        function F() {
            return constructor.apply(this, args);
        }


        F.prototype = constructor.prototype;
        return new F();
    }


    this.array = function(key, length, type) {
        checkAllocated();
        var args = [].slice.call(arguments, 1);
        args.unshift(null);
        args.unshift(null);
        priv.closures.push(function(p) {
            args[0] = p;
            args[1] = p.len;
            p.fields[key] = construct(ArrayField, args);
            p.len += p.fields[key].length;
        });

        return this;
    }
    var beenHere = false;

    function applyClosures(p) {
        if (beenHere)
            return;
        p.closures.forEach(function(el) {
            el(p);
        });
        beenHere = true;
    }

    function allocateFields() {
        for (var key in priv.fields) {
            if ('allocate' in priv.fields[key])
                priv.fields[key].allocate();
        }
    }


    this._setBuff = this.setBuffer = function(buff) {
        priv.buf = buff;
        applyClosures(priv);
        allocateFields();
        priv.allocated = true;
    }

    this.allocate = function() {
        applyClosures(priv);
        priv.buf = new Buffer(priv.len);
        allocateFields();
        priv.allocated = true;
        return this;
    }

    this._getPriv = function() {
        return priv;
    }

    this.getOffset = function(field){
        if(priv.fields[field]) return priv.fields[field].offset;
    }

    this.clone = function() {
        var c = new Struct;
        var p = c._getPriv();
        p.closures = priv.closures;
        return c;
    }

    this.length = function() {
        applyClosures(priv);
        return priv.len;
    }

    this.get = function(key) {
        if ( key in priv.fields) {
            return priv.fields[key].get();
        } else
            throw new Error('Can not find field ' + key);
    }

    this.set = function(key, val) {
        if (arguments.length == 2) {
            if ( key in priv.fields) {
                priv.fields[key].set(val);
            } else
                throw new Error('Can not find field ' + key);
        } else if (Buffer.isBuffer(key)) {
            this._setBuff(key);
        } else {
            for (var k in key) {
                this.set(k, key[k]);
            }
        }
    }
    this.buffer = function() {
        return priv.buf;
    }
    
    
    function getFields() {
        var fields = {};
        Object.keys(priv.fields).forEach(function(key) {
            var setFunc, getFunc;
            if(priv.fields[key] instanceof StructField ||
               priv.fields[key] instanceof ArrayField)  {
                   getFunc = function(){
                       return priv.fields[key].get().fields;
                   };
                   setFunc = function(newVal){
                       self.set(key, newVal); 
                   };
               }
             else {
               getFunc = priv.fields[key].get;
               setFunc = priv.fields[key].set;
             };
            
            Object.defineProperty(fields, key, {
                get : getFunc,
                set : setFunc,
                enumerable : true
            });
        });
        return fields;
    };

    var _fields;
    Object.defineProperty(this, 'fields', {
        get : function() {
            if (_fields)
                return _fields;
            return ( _fields = getFields());
        },
        enumerable : true,
        configurable : true
    });

}
